export default ({ env }) => ({
  "users-permissions": {
    config: {
      register: {
        allowedFields: ['username', 'email', 'password', 'first_name', 'last_name', 'avatar'],
      },
      // Si también necesitas incluir campos en el login, puedes configurarlos aquí si es necesario.
    },
  }
});
