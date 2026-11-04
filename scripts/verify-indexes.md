# MongoDB Atlas Index Verification & Performance Optimization Guide

This document catalogs the database indexes defined in the Labonnadhara Mongoose schemas, explains their query coverage, and provides `mongosh` commands to verify and build indexes directly on MongoDB Atlas.

---

## 1. Index Audit by Collection

### A. `users` Collection
Defined in `src/models/User.ts`:
- `{ email: 1 }` (Unique, Case-insensitive clean lookups)
  - **Query Coverage**: Authentication (`/api/auth/[...nextauth]`, `/api/auth/mobile/login`, `/api/auth/forgot-password`), Customer aggregations (`/api/admin/customers`).
  - **Atlas shell command**:
    ```javascript
    db.users.createIndex({ email: 1 }, { unique: true });
    ```

### B. `products` Collection
Defined in `src/models/Product.ts`:
- `{ slug: 1 }` (Unique via schema definition)
  - **Query Coverage**: Product details storefront route `/products/[slug]`.
- `{ isPublished: 1, category: 1 }` (Compound)
  - **Query Coverage**: Category listing queries filtering by published products.
- `{ isPublished: 1, createdAt: -1 }` (Compound)
  - **Query Coverage**: Storefront default sort (`newest`), admin dashboard.
- `{ isPublished: 1, price: 1 }` & `{ isPublished: 1, price: -1 }` (Compound)
  - **Query Coverage**: Storefront price sorting (`price-asc` and `price-desc`).
- `{ title: "text", description: "text" }` (Text Index)
  - **Query Coverage**: Keyword search in `/api/products` using `$text: { $search: query }`.
  - **Atlas shell commands**:
    ```javascript
    db.products.createIndex({ slug: 1 }, { unique: true });
    db.products.createIndex({ isPublished: 1, category: 1 });
    db.products.createIndex({ isPublished: 1, createdAt: -1 });
    db.products.createIndex({ isPublished: 1, price: 1 });
    db.products.createIndex({ isPublished: 1, price: -1 });
    db.products.createIndex({ title: "text", description: "text" }, { weights: { title: 5, description: 1 } });
    ```

### C. `orders` Collection
Defined in `src/models/Order.ts`:
- `{ invoiceNumber: 1 }` (Unique, Sparse)
  - **Query Coverage**: Invoicing lookups and order PDF regeneration.
- `{ customerEmail: 1, createdAt: -1 }` (Compound)
  - **Query Coverage**: Customer order history in user profile & customer stats aggregation in `/api/admin/customers`.
- `{ createdAt: -1 }`
  - **Query Coverage**: Admin order dashboard pagination.
- `{ fulfillmentStatus: 1, createdAt: -1 }` (Compound)
  - **Query Coverage**: Order fulfillment filtering in admin panel.
  - **Atlas shell commands**:
    ```javascript
    db.orders.createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
    db.orders.createIndex({ customerEmail: 1, createdAt: -1 });
    db.orders.createIndex({ createdAt: -1 });
    db.orders.createIndex({ fulfillmentStatus: 1, createdAt: -1 });
    ```

### D. `blogposts` Collection
Defined in `src/models/BlogPost.ts`:
- `{ slug: 1 }` (Unique via schema)
- `{ isPublished: 1, publishedAt: -1 }` (Compound)
  - **Query Coverage**: Blog listing page and blog RSS feeds.
  - **Atlas shell commands**:
    ```javascript
    db.blogposts.createIndex({ slug: 1 }, { unique: true });
    db.blogposts.createIndex({ isPublished: 1, publishedAt: -1 });
    ```

### E. `notifications` Collection
Defined in `src/models/Notification.ts`:
- `{ user: 1, createdAt: -1 }` (Compound)
  - **Query Coverage**: In-app mobile notifications list.
  - **Atlas shell commands**:
    ```javascript
    db.notifications.createIndex({ user: 1, createdAt: -1 });
    ```

---

## 2. Verification via mongosh

To inspect currently active indexes on your Atlas cluster:

```bash
mongosh "<MONGODB_URI>"
```

Run index verification queries:

```javascript
// List indexes on each collection
db.users.getIndexes();
db.products.getIndexes();
db.orders.getIndexes();
db.blogposts.getIndexes();

// Check query execution plan for a slow query
db.orders.explain("executionStats").find({ customerEmail: "test@example.com" }).sort({ createdAt: -1 });
```

Verify that the `winningPlan.stage` shows `IXSCAN` (Index Scan) rather than `COLLSCAN` (Collection Scan).

