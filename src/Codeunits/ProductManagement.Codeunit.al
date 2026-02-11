codeunit 50100 "Product Management"
{
    procedure CheckInventoryLevel(var Product: Record Product)
    begin
        if Product."Quantity in Stock" <= Product."Reorder Point" then
            Message('Product %1 - %2 is below reorder point. Current stock: %3, Reorder point: %4',
                Product."No.",
                Product.Name,
                Product."Quantity in Stock",
                Product."Reorder Point")
        else
            Message('Product %1 - %2 has sufficient stock. Current stock: %3',
                Product."No.",
                Product.Name,
                Product."Quantity in Stock");
    end;

    procedure UpdateQuantity(var Product: Record Product; QuantityChange: Decimal)
    begin
        Product."Quantity in Stock" := Product."Quantity in Stock" + QuantityChange;
        Product.Modify(true);
    end;

    procedure GetLowStockProducts(var Product: Record Product)
    begin
        Product.SetFilter("Quantity in Stock", '<=%1', Product."Reorder Point");
        Product.SetRange(Blocked, false);
    end;
}
