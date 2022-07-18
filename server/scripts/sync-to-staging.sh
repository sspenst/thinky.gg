#/bin/bash
echo "Downloading production data"
mongodump --uri=$MONGODB_URI_PROD_REPLICA --out backup
echo "Saved to ./backup"
echo "Restoring backup to staging"
mongorestore -d pathology-staging --drop --uri=$MONGODB_URI_STAGING_WRITING backup/pathology 
echo "Cleaning up"
rm -rf backup/pathology