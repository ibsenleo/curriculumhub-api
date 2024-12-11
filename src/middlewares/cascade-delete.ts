import { Schema } from "@strapi/strapi";

export default () => {
    return async (ctx, next) => {
        if (ctx.method === 'DELETE') {
            console.log("ENTRA")
            // const { id } = ctx.params;
            const entityName = ctx.request.url.split('/')[2];
            const id = ctx.request.url.split('/')[3]
            console.log(entityName, id)

            if (entityName !== 'resumees') {
                return await next(); // Si no es `resumees`, continuar con la solicitud
            }

            // Convertir el nombre plural al singular para coincidir con el modelo
            const modelName = normalizeModelName(entityName);

            const entityString = `api::${modelName}.${modelName}` as keyof typeof strapi.contentTypes;

            const model = strapi.contentTypes[entityString];
            console.log(model)
            if (!model) {
                console.warn(`Model not found for entity: ${modelName}`);
                return await next();
            }

            console.log("Obtaining relations of model")
            const relations = Object.entries(model.attributes).filter(
                ([, attribute]) => attribute.type === 'relation'
            );


            // Manejar eliminaciones en cascada
            for (const [relationKey, relation] of relations) {
                const targetModelUID = relation.target;

                // Evitar borrar relaciones con `user` o `office`
                if (relationKey === 'author' || relationKey === 'office') {
                    console.log(`Skipping deletion for relation: ${relationKey}`);
                    continue; // Saltar esta relación
                }

                // Solo manejar relaciones con `mappedBy` o `inversedBy` definidas
                if (relation.mappedBy || relation.inversedBy) {
                    const foreignKey = relation.mappedBy || relation.inversedBy;

                    console.log(
                        `Deleting related entities from ${targetModelUID} where ${foreignKey}=${id}`
                    );

                    // Eliminar entidades relacionadas
                    await strapi.db.query(targetModelUID).delete({
                        where: { [foreignKey]: id },
                    });
                }
            }
        }

        await next();
    };
};

/**
 * Normaliza el nombre plural a singular para encontrar el modelo
 * @param {string} pluralName - Nombre en plural desde la URL
 * @returns {string} - Nombre en singular esperado por el modelo
 */
function normalizeModelName(pluralName) {
    if (pluralName.endsWith('ies')) {
      // Ejemplo: "categories" -> "category"
      return pluralName.slice(0, -3) + 'y';
    } else if (pluralName.endsWith('s')) {
      // Ejemplo: "posts" -> "post"
      return pluralName.slice(0, -1);
    }
    return pluralName; // Si no termina en 's', se asume que ya está en singular
  }