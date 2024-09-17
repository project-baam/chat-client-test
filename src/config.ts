interface Config {
  apiUrl: string;
  socketUrl: string;
}

const config: { [key: string]: Config } = {
  development: {
    apiUrl: process.env.REACT_APP_API_URL!,
    socketUrl: process.env.REACT_APP_SOCKET_URL!,
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL!,
    socketUrl: process.env.REACT_APP_SOCKET_URL!,
  },
};

export default config[process.env.NODE_ENV || "development"];
