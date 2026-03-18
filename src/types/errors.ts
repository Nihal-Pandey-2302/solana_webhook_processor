export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Error') {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication Failed') {
    super(message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class QueueError extends AppError {
  constructor(message: string = 'Queue Service Unavailable') {
    super(message, 503);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database Service Unavailable') {
    super(message, 503);
  }
}
