page 50101 "Product Card"
{
    PageType = Card;
    ApplicationArea = All;
    UsageCategory = None;
    SourceTable = Product;
    Caption = 'Product Card';

    layout
    {
        area(Content)
        {
            group(General)
            {
                Caption = 'General';
                field("No."; Rec."No.")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the product number';
                }
                field(Name; Rec.Name)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the product name';
                }
                field(Description; Rec.Description)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the product description';
                    MultiLine = true;
                }
                field(Category; Rec.Category)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the product category';
                }
                field(Blocked; Rec.Blocked)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies if the product is blocked';
                }
            }
            group(Pricing)
            {
                Caption = 'Pricing';
                field("Unit Price"; Rec."Unit Price")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the unit price of the product';
                }
            }
            group(Inventory)
            {
                Caption = 'Inventory';
                field("Quantity in Stock"; Rec."Quantity in Stock")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the quantity available in stock';
                }
                field("Reorder Point"; Rec."Reorder Point")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the reorder point for the product';
                }
            }
            group(Info)
            {
                Caption = 'Information';
                field("Last Date Modified"; Rec."Last Date Modified")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies when the product was last modified';
                }
            }
        }
    }

    actions
    {
        area(Processing)
        {
            action(CheckInventory)
            {
                ApplicationArea = All;
                Caption = 'Check Inventory';
                ToolTip = 'Check if product needs reordering';
                Image = CheckList;
                Promoted = true;
                PromotedCategory = Process;

                trigger OnAction()
                var
                    ProductMgmt: Codeunit "Product Management";
                begin
                    ProductMgmt.CheckInventoryLevel(Rec);
                end;
            }
        }
    }
}
