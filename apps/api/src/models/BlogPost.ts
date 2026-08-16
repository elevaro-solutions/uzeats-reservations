import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const blogFaqItemSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const blogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    excerpt: { type: String, default: '' },
    bodyHtml: { type: String, required: true },
    coverImageUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],
    faq: { type: [blogFaqItemSchema], default: [] },
  },
  { timestamps: true },
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1, status: 1 });
blogPostSchema.index({ title: 'text', excerpt: 'text', seoTitle: 'text', seoDescription: 'text' });

export type BlogPostDocument = InferSchemaType<typeof blogPostSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BlogPost: Model<BlogPostDocument> =
  mongoose.models.BlogPost ?? mongoose.model<BlogPostDocument>('BlogPost', blogPostSchema);
