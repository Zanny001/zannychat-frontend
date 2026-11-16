/**
 * Keeps push-token registration scoped to the authenticated account.
 * Supabase auth events and the initial getSession() result can race, so
 * repeated requests for one account share a single in-flight registration.
 */
export function createPushRegistrationCoordinator(register) {
  if (typeof register !== 'function') {
    throw new TypeError('Push registration coordinator requires a registration function.');
  }

  let activeUserId = null;
  let registrationPromise = null;

  return {
    registerForUser(userId) {
      if (typeof userId !== 'string' || !userId) return Promise.resolve(null);
      if (activeUserId === userId) return registrationPromise || Promise.resolve(null);

      activeUserId = userId;
      registrationPromise = Promise.resolve()
        .then(() => register(userId))
        .catch((error) => {
          if (activeUserId === userId) {
            activeUserId = null;
            registrationPromise = null;
          }
          throw error;
        });
      return registrationPromise;
    },

    reset() {
      activeUserId = null;
      registrationPromise = null;
    },
  };
}
