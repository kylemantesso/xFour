import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

export const submitFeedback = mutation({
  args: {
    message: v.string(),
    type: v.optional(v.union(v.literal("bug"), v.literal("feature"), v.literal("general"))),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx);
    
    const feedbackId = await ctx.db.insert("feedback", {
      userId: user._id,
      message: args.message,
      type: args.type ?? "general",
      createdAt: Date.now(),
    });
    
    return feedbackId;
  },
});

export const listFeedback = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("feedback"),
    _creationTime: v.number(),
    userId: v.id("users"),
    message: v.string(),
    type: v.string(),
    createdAt: v.number(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const { isAdmin } = await getAuthenticatedUser(ctx);
    
    // Only admins can see all feedback
    if (!isAdmin) {
      return [];
    }
    
    const feedbackItems = await ctx.db
      .query("feedback")
      .order("desc")
      .take(100);
    
    // Enrich with user info
    const enriched = await Promise.all(
      feedbackItems.map(async (item) => {
        const feedbackUser = await ctx.db.get(item.userId);
        return {
          ...item,
          userName: feedbackUser?.name,
          userEmail: feedbackUser?.email,
        };
      })
    );
    
    return enriched;
  },
});
