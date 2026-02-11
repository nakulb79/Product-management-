# Product Management Application

This is a Dynamics 365 Business Central extension for shops that allows them to automate product management and inventory tracking.

## Features

- **Product Management**: Create and manage product information including name, description, category, and pricing
- **Inventory Tracking**: Track quantity in stock and set reorder points
- **Product List**: View all products in a convenient list format
- **Product Card**: Detailed view for individual product management
- **Inventory Alerts**: Check if products need reordering based on stock levels

## Installation

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install the [AL Language extension](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) for VS Code
3. Clone this repository
4. Open the folder in VS Code
5. Configure your launch.json with your Business Central instance details
6. Press F5 to compile and deploy the extension

## Usage

After installation, you can access the Product Management features from:
- Search for "Products" to open the Product List page
- Create new products using the "New" action
- Click on any product to open the Product Card for detailed management
- Use the "Check Inventory" action to verify stock levels

## Technical Details

- **Platform**: Dynamics 365 Business Central
- **Runtime**: 9.0
- **Application Version**: 19.0.0.0
- **Object ID Range**: 50100-50149

## Project Structure

```
├── app.json                          # Extension manifest
├── src/
│   ├── Tables/
│   │   └── Product.Table.al         # Product table definition
│   ├── Pages/
│   │   ├── ProductList.Page.al      # Product list page
│   │   └── ProductCard.Page.al      # Product card page
│   └── Codeunits/
│       └── ProductManagement.Codeunit.al  # Business logic
```

## License

This project is provided as-is for shop management automation
