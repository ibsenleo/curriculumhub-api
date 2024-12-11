// src/api/static-data/controllers/static-data.js
export default {
    async getStaticData(ctx) {
        try {
            // Query the Offices collection type
            const offices = await strapi.db.query('api::office.office').findMany({
                select: ['id', 'name', 'country'], // Specify the fields to return
                where: {
                    publishedAt: { $notNull: true }, // Ensure the item is published
                },
            });

            const orderedOffices = offices.sort((a,b) => {
                if (a.country < b.country) return -1;
                if (a.country > b.country) return 1;
                return 0;
            })

            // Static data for skillLevels
            const skillLevels = [
                { key: 0, label: "Novice" },
                { key: 1, label: "Beginner" },
                { key: 2, label: "Competent" },
                { key: 3, label: "Proficient" },
                { key: 4, label: "Expert" },
            ];

            // Return the combined data
            ctx.body = {
                skillLevels,
                offices: orderedOffices,
            };
        } catch (error) {
            ctx.throw(500, 'Failed to fetch static data');
        }
    },
};
