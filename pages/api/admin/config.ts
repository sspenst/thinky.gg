import { GameId } from '@root/constants/GameId';
import Role from '@root/constants/role';
import { ValidType } from '@root/helpers/apiWrapper';
import { logger } from '@root/helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import KeyValue from '@root/models/db/keyValue';
import { KeyValueModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

interface ConfigBodyProps {
  id?: string;
  key?: string;
  value?: string;
}

export default withAuth({
  GET: {},
  POST: {
    body: {
      key: ValidType('string'),
      value: ValidType('string'),
    }
  },
  PUT: {
    body: {
      id: ValidType('string'),
      key: ValidType('string'),
      value: ValidType('string'),
    }
  },
  DELETE: {
    body: {
      id: ValidType('string'),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!req.user.roles.includes(Role.ADMIN)) {
    return res.status(401).json({
      error: 'Not authorized'
    });
  }

  try {
    switch (req.method) {
    case 'GET': {
      // Get all key/value pairs for THINKY game
      const keyValues = await KeyValueModel.find({ gameId: GameId.THINKY }).sort({ createdAt: -1 }).lean<KeyValue[]>();

      return res.status(200).json(keyValues);
    }

    case 'POST': {
      const { key, value } = req.body as ConfigBodyProps;

      // Create a new key/value pair
      if (!key || !value) {
        return res.status(400).json({ error: 'Key and value are required' });
      }

      // Check if key already exists
      const existingKeyValue = await KeyValueModel.findOne({ gameId: GameId.THINKY, key });

      if (existingKeyValue) {
        return res.status(400).json({ error: 'Key already exists' });
      }

      const newKeyValue = await KeyValueModel.create({
        gameId: GameId.THINKY,
        key,
        value,
      });

      return res.status(201).json(newKeyValue);
    }

    case 'PUT': {
      const { id, key, value } = req.body as ConfigBodyProps;

      // Update an existing key/value pair
      if (!id || !key || !value) {
        return res.status(400).json({ error: 'ID, key, and value are required' });
      }

      // Check if key already exists (but not for the same document)
      const existingKey = await KeyValueModel.findOne({
        gameId: GameId.THINKY,
        key,
        _id: { $ne: new Types.ObjectId(id) }
      });

      if (existingKey) {
        return res.status(400).json({ error: 'Key already exists' });
      }

      const updatedKeyValue = await KeyValueModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), gameId: GameId.THINKY },
        { key, value },
        { new: true }
      );

      if (!updatedKeyValue) {
        return res.status(404).json({ error: 'Key/value pair not found' });
      }

      return res.status(200).json(updatedKeyValue);
    }

    case 'DELETE': {
      const { id } = req.body as ConfigBodyProps;

      // Delete a key/value pair
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const deletedKeyValue = await KeyValueModel.findOneAndDelete({
        _id: new Types.ObjectId(id),
        gameId: GameId.THINKY
      });

      if (!deletedKeyValue) {
        return res.status(404).json({ error: 'Key/value pair not found' });
      }

      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Error in admin config API:', error);

    return res.status(500).json({ error: 'Internal server error' });
  }
});
