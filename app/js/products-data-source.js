/**
 * Products Data Source — backend-backed data access for products.
 * Calls ApiClient domain methods (never fetch() directly) and normalizes
 * the backend snake_case into the frontend camelCase. No local fallback.
 */
const ProductsDataSource = {
    async getProducts() {
        const items = await ApiClient.getProductsFromApi();
        return items.map(c => this._normalizeProduct(c));
    },

    async createProduct(data) {
        const entity = await ApiClient.createProductInApi(data);
        return this._normalizeProduct(entity);
    },

    async updateProduct(id, data) {
        const entity = await ApiClient.updateProductInApi(id, data);
        return this._normalizeProduct(entity);
    },

    async deleteProduct(id) {
        await ApiClient.deleteProductInApi(id);
    },

    _normalizeProduct(c) {
        if (!c) return c;
        return {
            ...c,
            createdAt: c.created_at || c.createdAt,
            updatedAt: c.updated_at || c.updatedAt,
        };
    },
};
