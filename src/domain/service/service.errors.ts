export class ServiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Service with ID "${id}" not found`);
    this.name = 'ServiceNotFoundError';
  }
}
