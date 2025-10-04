// mongo-init.js
// Runs inside the mongo container at container first startup.
// Idempotent: does not duplicate users on repeated runs.

(function () {
  try {
    const dbName = "Unis";
    // don't shadow the global `db` variable; use a separate variable
    const _db = db.getSiblingDB(dbName);

    const users = [
      {
        _id: "23654e3c-905e-491b-a6dc-27fb05bfcf32",
        phone: "9876543210",
        role: "User",
        publicKey:
          "BIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy+f8Y6/lG5aE/L9Q3Y...",
        device: {
          deviceId: "1a49ddb6e7f56e76",
          deviceName: "sdk_gphone64_x86_64",
          // use new Date(...) - compatible in shell
          lastSeen: new Date("2025-10-04T04:18:26.539Z"),
          lastIP: "0.0.0.0",
          pushToken: "fEm_...-J_kc:APA91bF..._gY-m-3...s-n7...a-d-k...-a-g...",
          addedAt: new Date("2025-09-29T10:16:59.918Z"),
        },
        allowedContacts: [],
        createdAt: new Date("2025-09-29T10:16:59.923Z"),
        __v: 0,
      },
      {
        _id: "user-uuid-123456",
        phone: "9876543220",
        publicKey:
          "BIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy+f8Y6/lG5aE/L9Q3Y...",
        createdAt: new Date("2025-09-29T12:00:00.000Z"),
        device: {
          deviceId: "1a49ddb6e7f56e76",
          deviceName: "sdk_gphone64_x86_64",
          lastSeen: new Date("2025-10-03T18:41:29.055Z"),
          lastIP: "0.0.0.0",
          pushToken: "fEm_...-J_kc:APA91bF..._gY-m-3...s-n7...a-d-k...-a-g...",
          addedAt: new Date("2025-09-29T11:55:00.000Z"),
        },
        allowedContacts: [
          {
            contactId: "user-friend-uuid-67890",
            type: "Contact",
            addedAt: new Date("2025-09-29T12:15:00.000Z"),
            alias: "Best Friend",
          },
        ],
      },
    ];

    // Create collection if not present
    const collNames = _db.getCollectionNames();
    if (!collNames.includes("users")) {
      _db.createCollection("users");
      print("ℹ️  Created collection Unis.users");
    }

    // Insert each user if not present
    const inserted = [];
    users.forEach((u) => {
      if (!_db.users.findOne({ _id: u._id })) {
        const res = _db.users.insertOne(u);
        if (res && res.insertedId) {
          inserted.push(res.insertedId);
          print(`⭐ User inserted with ID: ${res.insertedId}`);
        } else {
          print(`⚠️  Insert may have failed for ID: ${u._id}`);
        }
      } else {
        print(`ℹ️  User already exists, skipping: ${u._id}`);
      }
    });

    if (inserted.length > 0) {
      print("✅ User initialization complete!");
    } else {
      print("✅ User initialization finished (no new users inserted).");
    }
  } catch (e) {
    print(`❌ mongo-init.js error: ${e}`);
  }
})();
