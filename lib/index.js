/**
 * dsh-model-organizer host half.
 *
 * The page is pure UI, but the built-in DeepSeek API-key route ships no model
 * discovery of its own. That is why the client cannot "test" that route: the
 * remote discovery face would answer NO_DISCOVERY before touching the network.
 *
 * This host half registers one discovery for the route's settings namespace. It
 * asks the official adapter to list the route's models, which is the adapter's own
 * key check (and, for the official endpoint, a real /models round-trip). The client
 * then uses that discovery exactly like it does for pi-ai routes.
 *
 * The namespace id is the profile entry id used by the shipped DeepSeek adapter
 * ("llm-deepseek" in the default profile; the shipped Models page matches the same
 * literal). Registering best-effort keeps a future upstream discovery from turning
 * this into a startup failure: duplicate registration is ignored.
 */
export const name = "model-organizer";
export const inject = ["llm"];

const DEEPSEEK_NS = "llm-deepseek";

function warn(ctx, message) {
  try {
    if (ctx.logger && typeof ctx.logger.warn === "function") ctx.logger.warn(message);
    else console.warn(message);
  } catch (e) {}
}

export function apply(ctx) {
  const llm = ctx.llm;
  if (llm === null || llm === undefined
    || typeof llm.registerModelDiscovery !== "function"
    || typeof llm.listModels !== "function") return;

  try {
    ctx.effect(function () {
      const dispose = llm.registerModelDiscovery(DEEPSEEK_NS, async function (request) {
        const provider = request && typeof request.provider === "string" ? request.provider : "";
        if (provider === "") return [];
        const models = await llm.listModels(provider);
        if (!Array.isArray(models) || models.length === 0) {
          /* The official adapter answers an empty list when no key is configured;
             surfacing that as a failure keeps the client from painting "✓ missing". */
          throw new Error("the official route returned no models (is the API key configured?)");
        }
        return models.map(function (model) {
          const out = { id: model.id };
          if (typeof model.name === "string" && model.name.length > 0) out.name = model.name;
          if (model.contextWindow !== undefined) out.contextWindow = model.contextWindow;
          if (model.maxTokens !== undefined) out.maxTokens = model.maxTokens;
          if (Array.isArray(model.inputModalities)) out.inputModalities = model.inputModalities.slice();
          return out;
        });
      });
      return typeof dispose === "function" ? dispose : function () {};
    }, "dsh-model-organizer: official route discovery");
  } catch (error) {
    warn(ctx, "dsh-model-organizer: could not register the official route discovery — "
      + String((error && error.message) || error));
  }
}