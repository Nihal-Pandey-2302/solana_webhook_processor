import { Router } from 'express';
import { logger } from '../../config';
import { createAddressSchema } from '../../types';
import { createAddress, deleteAddress, getAllAddresses } from '../../db/queries/addressQueries';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const parseResult = createAddressSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
    }

    const { address } = parseResult.data;
    const newAddress = await createAddress(address);
    res.status(201).json(newAddress);
  } catch (err) {
    logger.error({ err }, 'Error creating address');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const addresses = await getAllAddresses();
    res.json(addresses);
  } catch (err) {
    logger.error({ err }, 'Error fetching addresses');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteAddress(id);
    if (!success) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Error deleting address');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
