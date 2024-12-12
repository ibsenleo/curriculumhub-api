/**
 * resumee controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::resumee.resumee', ({ strapi }) => ({
    async create(ctx) {
        const { user } = ctx.state; // Obtén el usuario autenticado
        const { educations, experiences, skills, certifications, expertise, ...resumeeData } = ctx.request.body; // Desestructura los datos

        // Crea el nuevo Resumee
        const newResumee = await strapi.service('api::resumee.resumee').create({
            data: {
                ...resumeeData,
                author: user.id, // Asigna el ID del usuario logueado como autor
            },
        });

        // Crea las educaciones relacionadas
        if (educations && Array.isArray(educations)) {
            await Promise.all(
                educations.map(education =>
                    strapi.service('api::education.education').create({
                        data: {
                            ...education,
                            resumee: newResumee.id, // Relaciona cada educación con el nuevo Resumee
                        },
                    })
                )
            );
        }

        // Crea las experiences relacionadas
        if (experiences && Array.isArray(experiences)) {
            await Promise.all(
                experiences.map(experience =>
                    strapi.service('api::experience.experience').create({
                        data: {
                            ...experience,
                            resumee: newResumee.id, // Relaciona cada educación con el nuevo Resumee
                        },
                    })
                )
            );
        }

        // Crea las experiences relacionadas
        if (skills && Array.isArray(skills)) {
            await Promise.all(
                skills.map(skill =>
                    strapi.service('api::skill.skill').create({
                        data: {
                            ...skill,
                            resumee: newResumee.id, // Relaciona cada educación con el nuevo Resumee
                        },
                    })
                )
            );
        }

        // Crea las experiences relacionadas
        if (certifications && Array.isArray(certifications)) {
            await Promise.all(
                certifications.map(certification =>
                    strapi.service('api::certification.certification').create({
                        data: {
                            ...certification,
                            resumee: newResumee.id, // Relaciona cada educación con el nuevo Resumee
                        },
                    })
                )
            );
        }

        // Crea las expertises relacionadas, incluyendo los expertise_items
        if (expertise && Array.isArray(expertise)) {
            await Promise.all(
                expertise.map(async expertiseItem => {
                    // Crea cada expertise
                    const newExpertise = await strapi.service('api::expertise.expertise').create({
                        data: {
                            name: expertiseItem.name,
                            years: expertiseItem.years,
                            description: expertiseItem.description,
                            resumee: newResumee.id, // Relaciona cada expertise con el nuevo Resumee
                        },
                    });

                    // Crea los expertise_items relacionados con el expertise recién creado
                    if (expertiseItem.expertise_items && Array.isArray(expertiseItem.expertise_items)) {
                        await Promise.all(
                            expertiseItem.expertise_items.map(expertiseItemDetail =>
                                strapi.service('api::expertise-item.expertise-item').create({
                                    data: {
                                        ...expertiseItemDetail,
                                        expertise: newExpertise.id, // Relaciona cada expertise_item con el expertise recién creado
                                    },
                                })
                            )
                        );
                    }
                })
            );
        }

        // return newResumee;

        const populatedResumee = await strapi.db.query('api::resumee.resumee').findOne({
            where: { id: newResumee.id },
            populate: ['author', 'educations', 'experiences', 'skills', 'certifications', 'expertise.expertise_items'],
        });

        return populatedResumee;
    },

    async find(ctx) {
        const { user } = ctx.state;

        if (!user) {
            return ctx.unauthorized(`You must be logged in to view resumees`);
        }

        // Filtra los resumees solo si no es un administrador
        if (user.role && user.role.name !== 'Administrator') {
            ctx.query = {
                ...ctx.query,
                filters: {
                    ...(ctx.query.filters && typeof ctx.query.filters === 'object' ? ctx.query.filters : {}),
                    author: user.id,
                },
            };
        }

        const response = await super.find(ctx);
        return response;

    },

    async delete(ctx) {

        const { id } = ctx.params;

        try {

            // Verificar el tipo de ID
            if (!id) {
                return ctx.badRequest('No ID provided');
            }

            // Intentar convertir a número si es necesario
            const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;

            // Obtener el resumee con sus relaciones
            const resumee = await strapi.db.query('api::resumee.resumee').findOne({
                where: { id: parsedId },
                populate: {
                    experiences: true,
                    skills: true,
                    certifications: true,
                    educations: true,
                    expertise: {
                        populate: {
                            expertise_items: true
                        }
                    }
                }
            });

            if (!resumee) {
                return ctx.notFound(`Resumee with id ${id} not found`);
            }

            // Función de eliminación en cascada para entidades relacionadas
            const deleteRelatedEntities = async (entities, contentType, nestedRelations = {}) => {
                if (entities && entities.length > 0) {
                    await Promise.all(
                        entities.map(async (entity) => {

                            // Manejo de relaciones anidadas (e.g., expertise_items en expertise)
                            for (const [relationKey, relationContentType] of Object.entries(nestedRelations)) {
                                if (entity[relationKey] && entity[relationKey].length > 0) {
                                    console.log(`Deleting nested relation: ${relationContentType}`);
                                    await deleteRelatedEntities(entity[relationKey], relationContentType);
                                }
                            }

                            // Eliminar la entidad publicada
                            console.log(`Deleting ${contentType}`)
                            await strapi.db.query(contentType).delete({
                                where: { id: entity.id }
                            });
                        })
                    );
                }
            };

            // Eliminar entidades relacionadas
            await deleteRelatedEntities(resumee.experiences, 'api::experience.experience');
            await deleteRelatedEntities(resumee.skills, 'api::skill.skill');
            await deleteRelatedEntities(resumee.certifications, 'api::certification.certification');
            await deleteRelatedEntities(resumee.educations, 'api::education.education');
            await deleteRelatedEntities(resumee.expertise, 'api::expertise.expertise', {
                expertise_items: 'api::expertise-item.expertise-item'
            });

            // Eliminar draft del resumee si existe
            if (resumee.draftRelated) {
                await strapi.db.query('api::resumee.resumee').delete({
                    where: {
                        id: resumee.draftRelated.id,
                        publishedAt: null
                    }
                });
                console.log('Resumee draft deleted:', resumee.draftRelated.id);
            }

            // Eliminar el resumee principal
            const deletedResumee = await strapi.db.query('api::resumee.resumee').delete({
                where: { id }
            });

            // Devolver respuesta
            ctx.body = deletedResumee;
        } catch (error) {
            ctx.throw(500, error);
        }
    }
})
)
