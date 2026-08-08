import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Category } from '../models/Category';
import { pick } from '../utils/pick';

const UPDATE_FIELDS = ['name', 'slug', 'description', 'parent', 'status'] as const;

// Walks the proposed parent's ancestor chain to make sure `categoryId` doesn't
// appear in it — prevents both direct self-parenting and indirect cycles
// (A -> B -> C -> A) that a chain of individually-valid updates could create.
const wouldCreateCycle = async (categoryId: string, proposedParentId: string): Promise<boolean> => {
  let currentId: string | null = proposedParentId;
  while (currentId) {
    if (currentId === categoryId) return true;
    const current: { parent?: unknown } | null = await Category.findById(currentId).select('parent').lean();
    if (!current || !current.parent) return false;
    currentId = String(current.parent);
  }
  return false;
};

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  const { name, slug, parent } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.status(400).json({ error: 'Parent category not found' });
    }
  }

  // validateBody already stripped req.body to the category schema's allow-list.
  const category = await Category.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json(category);
};

export const getCategories = async (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as 'active' | 'inactive' | undefined;
  const parent = req.query.parent as string | undefined;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  if (parent === 'null') {
    filter.parent = null;
  } else if (parent) {
    filter.parent = parent;
  }

  const categories = await Category.find(filter)
    .sort({ createdAt: -1 })
    .populate('parent', 'name slug');

  res.json(categories);
};

export const getCategoryById = async (req: AuthenticatedRequest, res: Response) => {
  const category = await Category.findById(req.params.id).populate('parent', 'name slug');
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
  const { parent } = req.body as { parent?: string | null };

  if (parent) {
    if (parent === req.params.id) {
      return res.status(400).json({ error: 'A category cannot be its own parent' });
    }
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.status(400).json({ error: 'Parent category not found' });
    }
    if (await wouldCreateCycle(req.params.id, parent)) {
      return res.status(400).json({ error: 'Cannot set a descendant category as the parent (would create a cycle)' });
    }
  }

  const category = await Category.findByIdAndUpdate(req.params.id, pick(req.body, UPDATE_FIELDS), {
    new: true,
    runValidators: true
  }).populate('parent', 'name slug');
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
};
