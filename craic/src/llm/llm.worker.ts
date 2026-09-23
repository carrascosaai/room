import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// El modelo corre en un Web Worker para que la interfaz no se congele.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
