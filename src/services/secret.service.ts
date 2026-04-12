import type { ActorModel } from "../types/models.js";
import {
  SecretsManagerClient,
  BatchGetSecretValueCommand,
  CreateSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import { organizationRepository } from "../repositories/organization.repository.js";
import { environmentService } from "./environment.services.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import Config from "../config.js";
import { InvalidOperationError } from "../errors/InvalidOperationError.js";
import { secretRepository } from "../repositories/secret.repository.js";
import { EngineError } from "../errors/EngineError.js";

export const secretsClient = new SecretsManagerClient({
  region: "ap-south-1",
});

export const secretService = {
  createNew: async (
    data: { label: string; value: string },
    actor: ActorModel,
  ) => {
    const organization = await organizationRepository.findByActorId(actor.id);
    if (!organization) {
      throw new NotFoundError("organization");
    }
    const environment = await environmentService.getByActor(actor);

    const name = `org/${organization.id}/env/${environment.id}/secret/${data.label}`;

    const command = new CreateSecretCommand({
      Name: name,
      SecretString: data.value,
      KmsKeyId: Config.KMS_ARN,
    });

    const result = await secretsClient.send(command);

    if (!result.Name) {
      throw new InvalidOperationError("Failed to create new secret");
    }

    return await secretRepository.insert({
      organization_id: organization.id,
      environment_id: environment.id,
      label: data.label,
      secret_key: result.Name,
    });
  },

  getByActor: async (actor: ActorModel) => {
    const organization = await organizationRepository.findByActorId(actor.id);
    if (!organization) {
      throw new NotFoundError("organization");
    }

    return await secretRepository.findByOrganizationId(organization.id);
  },

  getByIds: async (secretIds: string[]): Promise<Record<string, string>> => {
    const secrets = await secretRepository.findByIds(secretIds);

    const command = new BatchGetSecretValueCommand({
      SecretIdList: secrets.map((secret) => secret.secret_key),
    });

    const res = await secretsClient.send(command);
    if (!res.SecretValues) {
      throw new EngineError("Unable to fetch secrets", res.Errors);
    }

    return Object.fromEntries(
      res.SecretValues.map((value) => {
        const secret = secrets.find((s) => s.secret_key === value.Name);

        if (!value.Name || !value.SecretString || !secret) {
          throw new EngineError("Unable to fetch secrets", res.Errors);
        }

        return [secret.id, value.SecretString];
      }),
    );
  },
};
