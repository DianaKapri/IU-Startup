// Scheduler MVP
module.exports = async function generateSchedule(data) {
  return {
    status: "ok",
    schedule: {
      "5A": {
        Monday: ["Math", "Russian", "PE"]
      }
    }
  };
};
