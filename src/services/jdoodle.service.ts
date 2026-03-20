import axios from "axios";
import { JDoodleConfig } from "../config/jdoodle.config";

export interface JDoodleRequest {
  script: string;
  language: string;
  versionIndex: string;
  stdin?: string;
  libs?: string;
}

export interface JDoodleResponse {
  output: string;
  statusCode: number;
  memory: string;
  cpuTime: string;
}

export class JDoodleService {
  static async executeCode(payload: JDoodleRequest) {
    try {
      const response = await axios.post(JDoodleConfig.endpoint, {
        clientId: JDoodleConfig.clientId,
        clientSecret: JDoodleConfig.clientSecret,
        script: payload.script,
        language: payload.language,
        versionIndex: payload.versionIndex,
        stdin: payload.stdin || "",
        libs: payload.libs || []
      });

      return response.data;
    } catch (error: any) {
      console.error("JDoodle Error:", error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || "Code execution failed");
    }
  }
}