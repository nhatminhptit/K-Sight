import NodeCache from "node-cache";

const myCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

export default myCache;
