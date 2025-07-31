import { ValidType } from '@root/helpers/apiWrapper';
import dbConnect from '@root/lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import jwt from 'jsonwebtoken';
import type { NextApiResponse } from 'next';
import Role from '@root/constants/role';
import User from '@root/models/db/user';
import { serialize } from 'cookie';
import cookieOptions from '@root/lib/cookieOptions';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import DiscordChannel from '@root/constants/discordChannel';
import { logger } from '@root/helpers/logger';

export default withAuth({
  POST: {
    body: {
      userId: ValidType('string', true),
    }
  },
  DELETE: {},
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  await dbConnect();

  if (req.method === 'POST') {
    // Only admins can start impersonation
    if (!req.user.roles.includes(Role.ADMIN)) {
      logger.warn(`Non-admin user ${req.user._id} (${req.user.name}) attempted to impersonate`);
      await queueDiscordWebhook(
        DiscordChannel.DevPriv, 
        `🚨 **Failed Impersonation Attempt**\nUser: ${req.user.name} (${req.user._id})\nReason: User is not an admin`
      );
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    const { userId } = req.body;

    // Find the user to impersonate
    const targetUser = await UserModel.findById(userId).lean<User>();

    if (!targetUser) {
      logger.warn(`Admin ${req.user._id} (${req.user.name}) attempted to impersonate non-existent user ${userId}`);
      await queueDiscordWebhook(
        DiscordChannel.DevPriv, 
        `🚨 **Failed Impersonation Attempt**\nAdmin: ${req.user.name} (${req.user._id})\nTarget User ID: ${userId}\nReason: User not found`
      );
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new JWT token with impersonation data
    const payload = {
      userId: targetUser._id.toString(),
      adminId: req.user._id.toString(), // Store the real admin ID
      isImpersonating: true,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    // Set the new token as a cookie
    res.setHeader('Set-Cookie', serialize('token', token, cookieOptions(req.headers?.host)));

    // Log successful impersonation
    logger.info(`Admin ${req.user._id} (${req.user.name}) started impersonating user ${targetUser._id} (${targetUser.name})`);
    await queueDiscordWebhook(
      DiscordChannel.DevPriv, 
      `👤 **Impersonation Started**\nAdmin: ${req.user.name} (${req.user._id})\nTarget: ${targetUser.name} (${targetUser._id})`
    );

    return res.status(200).json({
      success: true,
      targetUser: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
      }
    });
  } else if (req.method === 'DELETE') {
    // Stop impersonation and restore admin session
    // Check if we have impersonation info from the auth middleware
    const impersonatingAdminId = req.impersonatingAdminId;
    
    if (!impersonatingAdminId) {
      return res.status(400).json({ error: 'Not currently impersonating' });
    }

    // Verify the admin user exists and has admin role
    const adminUser = await UserModel.findById(impersonatingAdminId).lean<User>();
    
    if (!adminUser) {
      logger.error(`Admin user ${impersonatingAdminId} not found when stopping impersonation`);
      await queueDiscordWebhook(
        DiscordChannel.DevPriv, 
        `🚨 **Impersonation Error**\nAdmin ID: ${impersonatingAdminId}\nReason: Admin user not found when stopping impersonation`
      );
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (!adminUser.roles?.includes(Role.ADMIN)) {
      logger.error(`User ${impersonatingAdminId} (${adminUser.name}) lost admin role during impersonation`);
      await queueDiscordWebhook(
        DiscordChannel.DevPriv, 
        `🚨 **Security Alert**\nUser: ${adminUser.name} (${impersonatingAdminId})\nReason: Lost admin role during impersonation session`
      );
      return res.status(403).json({ error: 'Original user is not an admin' });
    }

    // Create a new JWT token for the admin
    const payload = {
      userId: impersonatingAdminId,
    };

    const newToken = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    // Set the new token as a cookie
    res.setHeader('Set-Cookie', serialize('token', newToken, cookieOptions(req.headers?.host)));

    // Log successful stop impersonation
    logger.info(`Admin ${impersonatingAdminId} (${adminUser.name}) stopped impersonating user ${req.user._id} (${req.user.name})`);
    await queueDiscordWebhook(
      DiscordChannel.DevPriv, 
      `🔚 **Impersonation Stopped**\nAdmin: ${adminUser.name} (${impersonatingAdminId})\nWas impersonating: ${req.user.name} (${req.user._id})`
    );

    return res.status(200).json({ success: true });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
});