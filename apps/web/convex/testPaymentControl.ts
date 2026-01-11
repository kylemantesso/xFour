import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Get the test payment loop control flag from database
 */
export const getLoopControl = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const control = await ctx.db
      .query("testPaymentControl")
      .withIndex("by_key", (q) => q.eq("key", "loop"))
      .unique();
    
    return control?.isEnabled ?? false;
  },
});

/**
 * Set the test payment loop control flag
 */
export const setLoopControl = internalMutation({
  args: { isEnabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("testPaymentControl")
      .withIndex("by_key", (q) => q.eq("key", "loop"))
      .unique();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        isEnabled: args.isEnabled,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("testPaymentControl", {
        key: "loop",
        isEnabled: args.isEnabled,
        updatedAt: Date.now(),
      });
    }
    
    return null;
  },
});
