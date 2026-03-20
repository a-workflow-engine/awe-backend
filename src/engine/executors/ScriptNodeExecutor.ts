import type { Transaction } from "kysely";
import type { DB } from "../../types/database.js";
import type { NodeModel } from "../../types/models.js";
import { BaseExecutor } from "./BaseExecutor.js";
import { ScriptNodeConfigurationSchema } from "../../schemas/node.schema.js";
import { evaluate } from "@bpmn-io/feelin";
import { DataIntegrityError } from "../../errors/DataIntegrity.js";
// import { fetchService } from "../../services/fetch.service.js";
import { buildFeelContext } from "../../utils/contextResolver.js";
import { TaskStatuses } from "../../types/enums.js";
import type { ContextVariables, ExecutorResult } from "../../types/engine.js";
import { edgeService } from "../../services/edge.services.js";
import { JDoodleService } from "../../services/jdoodle.service.js";
import { promises as fs } from "fs";
import path from "path";

export class ScriptNodeExecutor extends BaseExecutor {
  async execute(
    node: NodeModel,
    inputVariables: ContextVariables,
    transaction?: Transaction<DB>,
  ): Promise<ExecutorResult> {
    // createOrAppendFile("log.txt", "hi from script");
    // console.log("yo");
    const parsed = ScriptNodeConfigurationSchema.safeParse(node.configuration);
    // console.log("in");
    if (!parsed.success) {
      throw new DataIntegrityError(
        `Script node configuration is invalid node id=${node.id}`,
      );
    }
    const configuration = parsed.data;

    const currentContext = await buildFeelContext(inputVariables);
    const parameters = configuration.parameterMap.map(
      (parameter) => evaluate(parameter.valueExpression, currentContext).value,
    );

    const entryFunctionName = configuration.entryFunctionName;

    const stdin = JSON.stringify({params:parameters,});
    const wrappedScript = `def main(name,age):\n${configuration.sourceCode}

import json\ndef convert(obj):\n    if isinstance(obj,set):\n        return [convert(i) for i in obj]\n    elif isinstance(obj,tuple):\n        return [convert(i) for i in obj]\n    elif isinstance(obj,dict):\n        return {k: convert(v) for k, v in obj.items()}\n    elif isinstance(obj,list):\n        return [convert(i) for i in obj]\n    else:\n        return obj\nif __name__ == \"__main__\":\n    try:\n        raw_input = json.loads(input())\n        params = raw_input['params']\n        result = ${entryFunctionName}(*params)\n        result=convert(result)\n        print(json.dumps(result))\n    except Exception as e:\n        print(json.dumps({"error":str(e)}))
`;
    const payload = {
      script: wrappedScript,
      language: "python3",
      versionIndex: "5",
      stdin: stdin,
    };
    let jdoodleResponse;
    try {
      jdoodleResponse = await JDoodleService.executeCode(payload);
      console.log(jdoodleResponse);
    } catch (error: any) {
      return {
        status: TaskStatuses.FAILED,
        outputVariables: {},
        error: error.message,
        nextNodeId: null,
      };
    }
    let paresedOutput;
    try {
      const rawOutput=jdoodleResponse.output.trim();
      const lastLine=rawOutput.split("\n").pop();
      paresedOutput=JSON.parse(lastLine || "");
    } catch {
      paresedOutput=jdoodleResponse.output;
    }

      const responseBody = {
      output: paresedOutput,
      error: jdoodleResponse.error,
    };

    if (paresedOutput?.error ) {
      return {
        status: TaskStatuses.FAILED,
        outputVariables: {},
        error: paresedOutput?.error,
        nextNodeId: null,
      };
    }

    let outputVariables: Record<string, unknown> = {};
    configuration.responseMap.forEach(
      ({ jsonPath, contextVariable }) => {
        if (!contextVariable) {
          return;
        }
        outputVariables[contextVariable.name] = typeof responseBody.output==="object"?responseBody.output?.[jsonPath]:responseBody.output;
      }
    );

    const [nextNode] = await edgeService.getNextNodeIdsBySourceNodeId(node.id);

    return {
      status: TaskStatuses.COMPLETED,
      outputVariables: outputVariables,
      nextNodeId: nextNode ?? null,
    };
  }
}
