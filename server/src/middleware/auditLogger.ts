import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { logChange } from '../services/historyService';
import { logger } from '../utils/logger';

export const auditLogger = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { method, path, user, body } = req;
  
  // Only log sensitive operations (POST, PUT, DELETE) on critical paths
  const sensitivePaths = ['/api/admin', '/api/entities', '/api/proxies', '/api/planning', '/api/methods'];
  const isSensitivePath = sensitivePaths.some(p => path.startsWith(p));
  const isModification = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isSensitivePath && isModification && user) {
    // We'll capture the original res.json to log the result if needed, 
    // or just log that an attempt was made.
    const startTime = Date.now();
    
    // Patch res.json to log after successful completion
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fetch full user to get username
        import('../db').then(({ default: prisma }) => {
          return prisma.user.findUnique({ where: { id: user.id } });
        }).then(fullUser => {
          const username = fullUser?.username || 'Unknown';
          const validChangeTypes = ['create', 'update', 'delete'];
          const changeType = validChangeTypes.includes(method.toLowerCase()) 
            ? method.toLowerCase() as 'create' | 'update' | 'delete' 
            : 'update' as const;

          return logChange(null, {
            entityType: 'Audit',
            entityId: path,
            changeType: changeType,
            description: `Admin action: ${method} ${path} by ${username} [IP: ${req.ip}] [UA: ${req.get('user-agent')?.substring(0, 50)}...]`,
            newValue: body ? JSON.stringify(body) : null
          }, {
            id: user.id,
            username: username,
            role: user.role
          });
        }).catch(err => logger.error('Audit logging failed', err));
      }
      
      return originalJson.call(this, data);
    };
  }

  next();
};
