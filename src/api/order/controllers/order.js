"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY);

/**

order controller */
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
    async create(ctx) {
        const { products } = ctx.request.body;
        try {
            const lineItems = await Promise.all(
                products.map(async (product) => {
                    const item = await strapi.services.product.findOne({ id: product.id });

                    console.log("this is item------->", item);
                    console.log("this is product------->", product);

                    return {
                        price_data: {
                            currency: "Rupees",
                            product_data: {
                                name: item.name,
                            },
                            unit_amount: Math.round(item.price * 100),
                        },
                        quantity: product.quantity,
                    };
                })
            );

            const session = await stripe.checkout.sessions.create({
                shipping_address_collection: { allowed_countries: ["NEP"] },
                payment_method_types: ["card", "ach"],
                mode: "payment",
                success_url: process.env.CLIENT_URL + `/success`,
                cancel_url: process.env.CLIENT_URL + "/failed",
                line_items: lineItems,
            });

            const order = await strapi.services.order.create({ data: { products, stripeId: session.id } });

            return { stripeSession: session };
        } catch (error) {
            ctx.response.status = 500;
            return { error };
        }
    },
}));