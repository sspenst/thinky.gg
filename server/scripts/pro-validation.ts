// ts-node -r tsconfig-paths/register --files server/scripts/pro-validation.ts
import Role from '@root/constants/role';
import dbConnect from '@root/lib/dbConnect';
import { StripeEventModel, UserConfigModel } from '@root/models/mongoose';
import { giveAccessToAllGames } from '@root/pages/api/stripe-webhook';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

dotenv.config();

async function Go() {
  await dbConnect();
  const configs = await UserConfigModel.find({
    roles: { $in: [Role.PRO] }
  }).populate('userId');

  const userMap = new Map<string, { name: string, games: string[] }>();

  // Group configs by user ID
  for (const config of configs) {
    const userId = config.userId._id.toString();

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        name: config.userId.name,
        games: []
      });
    }

    userMap.get(userId)?.games.push(config.gameId);
  }

  // Output users and their pro games
  console.log('\nUsers with Pro access:');
  console.log('----------------------');

  for (const [userId, data] of userMap.entries()) {
    console.log(`${data.name}:`);
    console.log(`  Pro in: ${data.games.join(', ')}`);
    console.log('');
    // upgrade all access to both games
    await giveAccessToAllGames(new Types.ObjectId(userId));
  }

  // Find users with multiple pro subscriptions
  console.log('\nUsers with multiple Pro subscriptions:');
  console.log('------------------------------------');

  for (const [userId, data] of userMap.entries()) {
    if (data.games.length > 1) {
      console.log(`${data.name}:`);
      console.log(`  Pro in: ${data.games.join(', ')}`);
      console.log('');
      // Get stripe events for this user

      const stripeEvents = await StripeEventModel.find({
        userId: userId
      }).sort({ created: -1 });

      if (stripeEvents.length > 0) {
        console.log('  Stripe Events:');

        for (const event of stripeEvents) {
          console.log(`    ${event.type} at ${new Date(event.created * 1000).toISOString()}`);
        }

        console.log('');
      }
    }
  }
}

console.log('starting');
Go();
