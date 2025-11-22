import sys
import json

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    data = {
        "Invoice Number": "INV-30215",
        "Vendor Name": "Prime Industrial Suppliers",
        "Invoice Date": "22-Nov-2025",
        "Total Amount": 26078,
        "Items": [
            {
                "Item Name": "Aluminum Sheets 2mm",
                "HSN/SAC Code": None,
                "Quantity": 50,
                "Unit Price": 200,
                "Line Total": 10000,
            },
            {
                "Item Name": "Steel Rod 20mm",
                "HSN/SAC Code": None,
                "Quantity": 30,
                "Unit Price": 350,
                "Line Total": 10500,
            },
            {
                "Item Name": "Hex Bolts M10",
                "HSN/SAC Code": None,
                "Quantity": 200,
                "Unit Price": 8,
                "Line Total": 1600,
            },
        ],
    }
    print(json.dumps(data))

if __name__ == "__main__":
    main()