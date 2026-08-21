module.exports = {
  apps: [
    {
      name: 'pinnacle-backend',
      script: './dist/server.js',
      env_file: '.env', // Yeh direct .env file ko load kar lega!
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
