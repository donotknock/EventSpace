import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, signUserToken } from '../middleware/auth.js';

export const pairingRouter = Router();

const pairExchangeSchema = z.object({
  code: z.string().min(6).max(6),
});

// POST /api/companion/generate-pairing-code
// Protected endpoint: called from web desktop app settings
pairingRouter.post('/companion/generate-pairing-code', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.workspaceId || req.user!.workspaces[0] || null;
    const deviceName = (req.body?.deviceName as string)?.trim() || 'Mobile Device';

    // Invalidate any previously unused pairing codes for this specific device name and user
    await prisma.pairingCode.deleteMany({
      where: { userId, deviceName, used: false },
    });

    // Generate random secure 6-digit numeric code (e.g. 100000 - 999999)
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    const created = await prisma.pairingCode.create({
      data: {
        code: randomCode,
        userId,
        workspaceId,
        deviceName,
        expiresAt,
      },
    });

    res.json({
      success: true,
      code: created.code,
      deviceName: created.deviceName,
      expiresAt: created.expiresAt.toISOString(),
      expiresInSeconds: 300,
    });
  } catch (error) {
    console.error('Failed to generate pairing code:', error);
    res.status(500).json({ error: 'Failed to generate pairing code' });
  }
});

// GET /api/companion/devices - List all paired & pending devices for user
pairingRouter.get('/companion/devices', requireAuth, async (req: Request, res: Response) => {
  try {
    const devices = await prisma.pairingCode.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        deviceName: true,
        used: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    res.json(devices);
  } catch (error) {
    console.error('Failed to list paired devices:', error);
    res.status(500).json({ error: 'Failed to retrieve paired devices' });
  }
});

// DELETE /api/companion/devices/:id - Revoke device pairing
pairingRouter.delete('/companion/devices/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.pairingCode.deleteMany({
      where: { id, userId: req.user!.id },
    });
    res.json({ success: true, message: 'Device pairing revoked successfully' });
  } catch (error) {
    console.error('Failed to revoke device:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

// POST /api/pair & POST /api/companion/pair
// Public endpoint for mobile companion app to exchange 6-digit code for long-lived JWT
const handlePairExchange = async (req: Request, res: Response) => {
  try {
    const parsed = pairExchangeSchema.safeParse(req.body);
    const code = parsed.success ? parsed.data.code : req.body?.pin || req.body?.code;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a 6-digit pairing code',
      });
    }

    const cleanCode = code.trim();

    // Look for matching active pairing code
    const pairing = await prisma.pairingCode.findUnique({
      where: { code: cleanCode },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!pairing) {
      return res.status(401).json({
        success: false,
        error: 'Invalid pairing code. Generate a new code from Web App Settings.',
      });
    }

    if (pairing.used) {
      return res.status(401).json({
        success: false,
        error: 'This pairing code has already been used. Please generate a new one.',
      });
    }

    if (new Date() > pairing.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'Pairing code expired. Please generate a fresh code in Settings.',
      });
    }

    const companionDeviceName = (req.body?.deviceName as string)?.trim() || pairing.deviceName || 'Mobile Device';

    // Mark code as used and update device name
    await prisma.pairingCode.update({
      where: { id: pairing.id },
      data: { used: true, deviceName: companionDeviceName },
    });

    // Determine default workspace for the companion
    let targetWorkspaceId = pairing.workspaceId;
    if (!targetWorkspaceId) {
      const userWorkspaces = await prisma.workspaceMember.findMany({
        where: { userId: pairing.user.id },
        select: { workspaceId: true },
      });
      targetWorkspaceId = userWorkspaces[0]?.workspaceId || null;
    }

    // Issue long-lived JWT token (365 days for paired mobile devices)
    const token = signUserToken(
      {
        userId: pairing.user.id,
        username: pairing.user.username,
        role: pairing.user.role,
      },
      '365d'
    );

    res.json({
      success: true,
      token,
      workspaceId: targetWorkspaceId,
      username: pairing.user.username,
      user: pairing.user,
      deviceName: companionDeviceName,
      pairedAt: new Date().toISOString(),
      service: 'EventSpace Mobile Companion API',
      version: '1.1.2a',
    });
  } catch (error) {
    console.error('Pairing exchange error:', error);
    res.status(500).json({ success: false, error: 'Pairing verification failed' });
  }
};

pairingRouter.post('/pair', handlePairExchange);
pairingRouter.post('/companion/pair', handlePairExchange);
