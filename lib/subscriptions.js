export function subscriptionPeriodEnd(subscription) {
  const value = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  return value ? new Date(value * 1000) : null;
}

export async function updateSubscriptionPlan({ stripe, subscriptionId, currentPlanCode, plan, vehicleCount, metadata }) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items?.data?.[0];
  if (!item) throw new Error("The Stripe subscription has no billable item.");

  const subscriptionItem = { id: item.id, quantity: vehicleCount };
  if (currentPlanCode !== plan.code) {
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: plan.price * 100,
      recurring: { interval: "month" },
      nickname: `Lucent ${plan.name} monthly per vehicle`,
      metadata: { plan_code: plan.code },
      product_data: {
        name: `Lucent ${plan.name} vehicle care`,
        description: `${plan.visits} - ${plan.audience}`,
        metadata: { plan_code: plan.code }
      }
    });
    subscriptionItem.price = price.id;
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [subscriptionItem],
    proration_behavior: "create_prorations",
    metadata: { ...subscription.metadata, ...metadata }
  });
}
