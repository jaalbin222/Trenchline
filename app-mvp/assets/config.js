/* Trenchline product config.
   The only place the call price, practitioner payout, and send caps live.
   The marketing page loads this file. A backend should return the same fields
   and leave the UI alone. */
(function () {
  const TL = (window.TL = window.TL || {});
  TL.CONFIG = Object.freeze({
    pricePerCallUsd: 50,
    callMinutes: 30,
    expertPayoutUsd: 35,
    inviteResponseHours: 24,
    payoutDays: 15,
    linkedinDailyCap: 20,
    emailDailyCap: 60,
    storageKey: "trenchline.app-mvp.v1",
    featuredVertical: "Fintech / financial services",
  });
})();
