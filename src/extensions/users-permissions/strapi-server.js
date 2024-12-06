// src/extensions/users-permissions/strapi-server.js

export default (plugin) => {
    plugin.controllers.auth.register = async (ctx) => {
      const { username, email, password, first_name, last_name, avatar } = ctx.request.body;
  
      // Validar los campos obligatorios
      if (!username || !email || !password) {
        return ctx.badRequest('Los campos username, email y password son obligatorios');
      }
  
      try {
        // Crear el usuario usando la API de consulta de Strapi (Query API)
        const user = await strapi.query('plugin::users-permissions.user').create({
          data: {
            username,
            email,
            password,
            first_name,
            last_name,
            avatar,
          },
        });
  
        // Generar JWT para el usuario registrado
        const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });
  
        // Responder con el usuario y el token
        ctx.send({
          jwt,
          user,
        });
      } catch (error) {
        ctx.badRequest('Ocurrió un error durante el registro del usuario', { error });
      }
    };
  
    return plugin;
  };
  