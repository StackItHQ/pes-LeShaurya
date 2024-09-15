from dotenv import load_dotenv
from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import pooling
import os

load_dotenv()

app = Flask(__name__)

# Create a connection pool
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=10,
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASS'),
    database=os.getenv('DB_NAME')
)

@app.route('/update-from-sheet', methods=['POST'])
def update_from_sheet():
    try:
        data = request.json
        action = data.get('action', 'update')

        connection = pool.get_connection()
        cursor = connection.cursor()

        if action == 'bulk_update':
            # Clear the existing table
            cursor.execute("TRUNCATE TABLE sheet_data")
            
            # Insert all rows with their new ids
            rows = data['rows']
            query = "INSERT INTO sheet_data (id, column1, column2) VALUES (%s, %s, %s)"
            cursor.executemany(query, rows)

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({"success": True, "message": f"{action} operation completed successfully"})
    except Exception as error:
        print(f'Error in {action} operation:', error)
        return jsonify({"success": False, "message": f"Error in {action} operation"}), 500

@app.route('/get-updates', methods=['GET'])
def get_updates():
    try:
        last_sync = request.args.get('lastSync')

        connection = pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        query = "SELECT * FROM sheet_data WHERE last_updated > %s"
        cursor.execute(query, (last_sync,))

        rows = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify(rows)
    except Exception as error:
        print('Error fetching updates:', error)
        return jsonify({"success": False, "message": "Error fetching updates"}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    app.run(port=port)
