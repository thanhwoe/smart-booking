/**
 * Port: IIdentityProvider
 * Application layer abstraction over any identity/auth provider (Clerk, Auth0, etc.)
 */
export interface IIdentityProvider {
  deleteUser(externalId: string): Promise<void>;
}

export const IIdentityProvider = Symbol('IIdentityProvider');
