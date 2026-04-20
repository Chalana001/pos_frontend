import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const formatPlanName = (name) => {
  const labels = {
    MONTHLY_LITE: 'Lite Monthly',
    YEARLY_LITE: 'Lite Yearly',
    MONTHLY_PRO: 'Pro Monthly',
    YEARLY_PRO: 'Pro Yearly',
    MONTHLY_DEMO: 'Demo',
  };
  return labels[name] || name?.replaceAll('_', ' ') || 'Package';
};

const SubscriptionPage = () => {
  const [plans, setPlans] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const adminWhatsApp = "+94700000000";

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const plansRes = await api.get('/api/saas/plans');
      setPlans(plansRes.data);

      const mySubRes = await api.get('/api/saas/my-subscription');
      setMySubscription(mySubRes.data);

    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("No active subscription found for this shop.");
        setMySubscription(null);
      }
      else {
        console.error("Error fetching subscription data", error);
      }

    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading plans...</div>;

  const expireDate = mySubscription?.validUntil
    ? new Date(mySubscription.validUntil).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : null;

  const isExpired = mySubscription?.validUntil
    ? new Date(mySubscription.validUntil) < new Date()
    : false;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        <div className={`p-6 rounded-lg mb-8 shadow-sm border-l-4 ${isExpired ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'}`}>
          <h2 className={`text-xl font-bold ${isExpired ? 'text-red-700' : 'text-yellow-800'}`}>
            {isExpired ? "Your Subscription Has Expired!" : "Subscription Status"}
          </h2>
          <p className="mt-2 text-gray-700 text-lg">
            Your current package <strong>{formatPlanName(mySubscription?.plan?.name)}</strong>
            {isExpired ? " expired on " : " is valid until "}
            <span className="font-bold text-black">{expireDate || 'N/A'}</span>.
          </p>
          <p className="mt-4 text-gray-800 font-medium bg-white p-3 rounded border inline-block">
            To renew or upgrade your package, please contact Admin (Chalana) on WhatsApp or Call: <br/>
            <a href={`https://wa.me/${adminWhatsApp.replace(/\D/g, '')}`} className="text-green-600 font-bold text-xl hover:underline">
              {adminWhatsApp}
            </a>
          </p>
        </div>

        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Available Packages</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isActivePlan = mySubscription?.plan?.id === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white p-6 rounded-xl shadow-md border-2 transition-all ${
                  isActivePlan ? 'border-blue-500 transform scale-105' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {isActivePlan && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    CURRENT PLAN
                  </div>
                )}

                <h4 className="text-xl font-bold text-gray-800 uppercase">{formatPlanName(plan.name)}</h4>
                <p className="text-gray-500 text-sm mt-1">Billing: {plan.billingCycle}</p>

                <div className="my-4">
                  <span className="text-3xl font-extrabold text-gray-900">Rs. {plan.initialPrice}</span>
                  {plan.billingCycle === 'MONTHLY'
                    ? <span className="text-gray-500">/mo</span>
                    : <span className="text-gray-500">/yr</span>}
                </div>

                <ul className="mt-4 space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">OK</span>
                    Max Branches: <strong className="ml-1">{plan.maxBranches}</strong>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">OK</span>
                    Renewal Cost: Rs. {plan.renewalPrice}
                  </li>
                </ul>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default SubscriptionPage;
