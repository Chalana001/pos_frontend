/**
 * What a promotion is doing right now, derived from its dates and flags rather than the
 * stored `active` boolean alone — which said nothing about the dates, so a campaign that
 * ended in March still rendered as a green "Active" pill today.
 *
 * <p>Mirrors `PromotionService.lifecycleStatus` on the backend. The history endpoint sends its
 * own `status`; this is for the list, which reads the plain promotion rows.
 */
export const promotionStatus = (promotion, now = new Date()) => {
  if (!promotion) return "ENDED";
  if (promotion.deleted) return "ARCHIVED";
  const start = promotion.startAt ? new Date(promotion.startAt) : null;
  const end = promotion.endAt ? new Date(promotion.endAt) : null;
  if (end && end < now) return "ENDED";
  if (!promotion.active) return "PAUSED";
  if (start && start > now) return "SCHEDULED";
  if (end && end - now < 48 * 60 * 60 * 1000) return "ENDING_SOON";
  return "LIVE";
};
