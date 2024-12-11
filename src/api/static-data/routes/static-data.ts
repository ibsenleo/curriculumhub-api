// src/api/static-data/routes/static-data.js
export default {
    routes: [
        {
            method: 'GET',
            path: '/static-data',
            handler: 'static-data.getStaticData',
            config: {
                auth: {
                    type: 'jwt'
                },
            }
        },
    ],
};
