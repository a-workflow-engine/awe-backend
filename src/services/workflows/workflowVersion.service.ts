import { workflowVersionRepository } from "../../repositories/workflowVersion.repository.js";
import {
  EnvironmentTypes,
  NodeTypes,
  WorkflowVersionStatuses,
} from "../../types/enums.js";
import type {
  ActorModel,
  EdgeModel,
  EnvironmentModel,
  NodeModel,
  OrganizationModel,
  WorkflowVersionModel,
} from "../../types/models.js";
import { edgeService } from "../edge.services.js";
import { nodeService } from "../node.services.js";
import {
  type DetailVersionInput,
  type ListVersionsInput,
  type ToggleVersionInput,
} from "../../schemas/workflowVersion.schema.js";
import { StateTransitionError } from "../../errors/StateTransitionError.js";
import { InvalidOperationError } from "../../errors/InvalidOperationError.js";
import { nodeSchemaService } from "../nodeSchema.service.js";
import { NotFoundError } from "../../errors/NotFoundError.js";
import { converterUtils } from "../../utils/converter.utils.js";
import { DataIntegrityError } from "../../errors/DataIntegrity.js";
import { paginationUtils } from "../../utils/pagination.utils.js";
import { environmentUtils } from "../../utils/environment.utils.js";
import { workflowActiveDeploymentRepository } from "../../repositories/workflowActiveDeployment.repository.js";
import { nodeRepository } from "../../repositories/node.repository.js";
import type {
  StartVariable,
  WorkflowVersionMetadata,
} from "../../types/workflowVersion.js";
import { StartNodeConfigurationSchema } from "../../schemas/node.schema.js";
import type { StartNodeConfiguration } from "../../types/workflow.js";
import { workflowDraftService } from "./workflowDraft.service.js";
import { workflowDeploymentRepository } from "../../repositories/workflowDeployment.repository.js";

function getStartVariables(
  startConfig: StartNodeConfiguration,
): StartVariable[] {
  const startVariables: StartVariable[] = [];

  startConfig.inputDataMap.forEach((data) => {
    if (!data.fetchableId) {
      startVariables.push({
        jsonPath: data.jsonPath,
        dataType: data.dataType,
        required: data.required !== false,
        ...(data.required === false ? { defaultValue: data.defaultValue } : {}),
      });
    }
  });

  return startVariables;
}

export const workflowVersionService = {
  listPaginated: async (
    data: ListVersionsInput,
    environments: EnvironmentModel[],
  ) => {
    const selectedEnvironment = environmentUtils.getSelectedEnvironmentOrThrow(
      environments,
      data.environment,
    );

    const { items, total } = await workflowVersionRepository.findPaginated({
      workflowId: data.workflowId,
      limit: data.limit,
      offset: paginationUtils.getOffset(data.page, data.limit),
      environmentId: selectedEnvironment.id,
    });

    const pagination = paginationUtils.getPaginationResponse(
      total,
      data.page,
      data.limit,
    );

    return {
      versions: items,
      pagination,
    };
  },

  getDetail: async (
    data: DetailVersionInput,
    environments: EnvironmentModel[],
  ): Promise<WorkflowVersionMetadata> => {
    const selectedEnvironment = environmentUtils.getSelectedEnvironmentOrThrow(
      environments,
      data.environment,
    );

    const [versionMeta, startNodes] = await Promise.all([
      workflowVersionRepository.findByIdAndEnvironmentIdAsMeta(
        data.versionId,
        selectedEnvironment.id,
      ),
      nodeRepository.findByWorkflowVersionIdAndNodeType(
        data.versionId,
        NodeTypes.START,
      ),
    ]);

    if (!versionMeta) {
      throw new NotFoundError("Workflow Version");
    }

    const nodeModels: NodeModel[] = [];
    const edgeModels: EdgeModel[] = [];

    if (data.include === "definition") {
      nodeModels.push(
        ...(await nodeService.getByWorkflowVersionId(versionMeta.id)),
      );
      edgeModels.push(...(await edgeService.getByNodes(nodeModels)));
    }

    const startConfig = startNodes[0]
      ? converterUtils.parseOrThrow(
          StartNodeConfigurationSchema,
          startNodes[0].configuration,
        )
      : null;

    const startVariables = startConfig ? getStartVariables(startConfig) : [];

    return {
      ...versionMeta,
      environment: selectedEnvironment.type,
      startVariables,
      ...(data.include === "definition"
        ? {
            definition: {
              nodes: nodeModels.map((node) =>
                nodeSchemaService.getNodeSchema(node),
              ),
              edges: edgeModels.map((edge) =>
                edgeService.toEdgeSchema(edge, nodeModels),
              ),
            },
          }
        : {}),
    };
  },

  clone: async (
    versionId: string,
    actor: ActorModel,
    environments: EnvironmentModel[],
  ): Promise<WorkflowVersionMetadata> => {
    const workflowVersion =
      await workflowVersionRepository.findByIdAndEnvironmentIdAsMeta(
        versionId,
        ...environments.map((env) => env.id),
      );

    if (!workflowVersion) {
      throw new NotFoundError("Workflow Version");
    }

    const nodes = await nodeService.getByWorkflowVersionId(workflowVersion.id);
    const edges = await edgeService.getByNodes(nodes);

    return await workflowDraftService.createNew(
      {
        workflowId: workflowVersion.workflowId,
        description: workflowVersion.description,
        definition: {
          nodes: nodes.map((node) => nodeSchemaService.getNodeSchema(node)),
          edges: edges.map((edge) => edgeService.toEdgeSchema(edge, nodes)),
        },
      },
      actor,
    );
  },

  activate: async (
    data: ToggleVersionInput,
    environments: EnvironmentModel[],
  ): Promise<WorkflowVersionMetadata> => {
    const selectedEnvironment = environmentUtils.getSelectedEnvironmentOrThrow(
      environments,
      data.environment,
    );

    const models =
      await workflowVersionRepository.findByIdAndEnvironmentIdWithDeployment(
        data.versionId,
        selectedEnvironment.id,
      );

    if (
      !models ||
      models.workflowVersion.status !== WorkflowVersionStatuses.PUBLISHED ||
      !models.workflowVersion.major_version
    ) {
      throw new NotFoundError("Workflow Version");
    }

    const { workflowVersion, deployment, activeDeployment } = models;

    if (activeDeployment) {
      throw new StateTransitionError("Workflow version is already active");
    }

    await workflowActiveDeploymentRepository.upsert({
      deployment_id: deployment.id,
      environment_id: selectedEnvironment.id,
      workflow_id: workflowVersion.workflow_id,
      major_version: models.workflowVersion.major_version,
    });

    return workflowVersionService.getDetail(
      {
        versionId: data.versionId,
        environment: selectedEnvironment.type,
      },
      environments,
    );
  },

  deactivate: async (
    data: ToggleVersionInput,
    environments: EnvironmentModel[],
  ): Promise<WorkflowVersionMetadata> => {
    const selectedEnvironment = environmentUtils.getSelectedEnvironmentOrThrow(
      environments,
      data.environment,
    );

    const models =
      await workflowVersionRepository.findByIdAndEnvironmentIdWithDeployment(
        data.versionId,
        selectedEnvironment.id,
      );

    if (
      !models ||
      models.workflowVersion.status !== WorkflowVersionStatuses.PUBLISHED ||
      !models.workflowVersion.major_version
    ) {
      throw new NotFoundError("Workflow Version");
    }

    const { workflowVersion, deployment, activeDeployment } = models;

    console.log(activeDeployment);
    if (!activeDeployment) {
      throw new StateTransitionError("Workflow version is not active");
    }

    await workflowActiveDeploymentRepository.delete(
      selectedEnvironment.id,
      workflowVersion.workflow_id,
      deployment.id,
      models.workflowVersion.major_version,
    );

    return workflowVersionService.getDetail(
      {
        versionId: data.versionId,
        environment: selectedEnvironment.type,
      },
      environments,
    );
  },

  promote: async (
    versionId: string,
    organization: OrganizationModel,
    environments: EnvironmentModel[],
  ): Promise<WorkflowVersionMetadata> => {
    const [workflowVersion, deployments] = await Promise.all([
      workflowVersionRepository.findIdAndOrganizationId(
        versionId,
        organization.id,
      ),
      workflowDeploymentRepository.findByWorkflowVersionId(versionId),
    ]);

    if (
      !workflowVersion ||
      workflowVersion.status !== WorkflowVersionStatuses.PUBLISHED
    ) {
      throw new NotFoundError("Workflow Version");
    }

    const orderedEnvironmentTypes = [
      EnvironmentTypes.DEVELOPMENT,
      EnvironmentTypes.STAGING,
      EnvironmentTypes.PRODUCTION,
    ];

    let targetEnvironment: EnvironmentModel | undefined = undefined;

    for (let envType of orderedEnvironmentTypes) {
      const environment = environments.find((env) => env.type === envType);
      if (!environment) {
        throw new DataIntegrityError(`Environment type ${envType} not found`);
      }

      const latestDeployment = deployments.find(
        (d) => d.environment_id === environment.id,
      );

      if (!latestDeployment) {
        targetEnvironment = environment;
        break;
      }
    }

    if (!targetEnvironment) {
      throw new InvalidOperationError("Cannot promote this workflow version");
    }

    await workflowDeploymentRepository.insert({
      environment_id: targetEnvironment.id,
      workflow_version_id: workflowVersion.id,
    });

    return workflowVersionService.getDetail(
      {
        versionId: versionId,
        environment: targetEnvironment.type,
      },
      environments,
    );
  },

  getActiveVersionByWorkflowIdWithRelations: async (workflowId: string) => {
    return await workflowVersionRepository.findActiveVersionByWorkflowIdWithRelations(
      workflowId,
    );
  },
};
