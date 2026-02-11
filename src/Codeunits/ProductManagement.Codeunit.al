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
    var
        NewQuantity: Decimal;
    begin
        NewQuantity := Product."Quantity in Stock" + QuantityChange;
        if NewQuantity < 0 then
            Error('Cannot reduce quantity below zero. Current stock: %1, Attempted change: %2',
                Product."Quantity in Stock",
                QuantityChange);

        Product."Quantity in Stock" := NewQuantity;
        Product.Modify(true);
    end;

    procedure GetLowStockProducts(var Product: Record Product)
    var
        TempProduct: Record Product;
    begin
        Product.Reset();
        Product.SetRange(Blocked, false);
        
        if Product.FindSet() then
            repeat
                if Product."Quantity in Stock" <= Product."Reorder Point" then begin
                    TempProduct := Product;
                    TempProduct.Mark(true);
                end;
            until Product.Next() = 0;
        
        Product.MarkedOnly(true);
    end;
}
