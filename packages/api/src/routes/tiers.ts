import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import { DEFAULT_TIER_DEFINITIONS } from "@equiduty/shared";
import type { TierDefinitionPublic, TierDefinition } from "@equiduty/shared";

/** In-memory cache for public tiers */
let publicTiersCache: { data: TierDefinitionPublic[]; expiry: number } | null =
  null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function toPublic(tier: TierDefinition): TierDefinitionPublic {
  return {
    tier: tier.tier,
    name: tier.name,
    description: tier.description,
    price: tier.price,
    limits: tier.limits,
    modules: tier.modules,
    addons: tier.addons,
    sortOrder: tier.sortOrder ?? 0,
    features: tier.features,
    popular: tier.popular,
    isBillable: tier.isBillable,
    isDefault: tier.isDefault,
  };
}

export const tierRoutes = async (fastify: FastifyInstance) => {
  /**
   * GET / — Public tier list
   * Rate-limited to 30 req/min per IP (via route-level config)
   */
  fastify.get(
    "/",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60000,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Return cached data if fresh
      if (publicTiersCache && publicTiersCache.expiry > Date.now()) {
        return reply.send(publicTiersCache.data);
      }

      try {
        const snapshot = await db.collection("tierDefinitions").get();

        let tiers: TierDefinitionPublic[];

        if (snapshot.empty) {
          // Fall back to built-in defaults
          tiers = Object.values(DEFAULT_TIER_DEFINITIONS)
            .filter((t) => t.enabled !== false && t.visibility !== "hidden")
            .map(toPublic);
        } else {
          tiers = snapshot.docs
            .map((doc) => ({ ...doc.data(), tier: doc.id }) as TierDefinition)
            .filter((t) => t.enabled !== false && t.visibility !== "hidden")
            .map(toPublic);
        }

        // Sort by sortOrder
        tiers.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        // Cache
        publicTiersCache = { data: tiers, expiry: Date.now() + CACHE_TTL };

        return reply.send(tiers);
      } catch (error) {
        _request.log.error({ error }, "Failed to fetch public tiers");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch tiers",
        });
      }
    },
  );
};
