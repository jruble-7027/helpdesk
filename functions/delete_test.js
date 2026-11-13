const admin = require("firebase-admin");
process.env.GCLOUD_PROJECT = "wca-tickets-58f6c";
admin.initializeApp({ projectId: "wca-tickets-58f6c" });

async function run() {
  try {
    await admin.firestore().collection("tickets").doc("dTjsfNFn3HZmpmkkXPKe").delete();
    console.log("Deleted test ticket dTjsfNFn3HZmpmkkXPKe successfully");
  } catch (err) {
    console.error("Error deleting:", err);
  }
}
run();
