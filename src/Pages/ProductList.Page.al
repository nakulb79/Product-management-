page 50100 "Product List"
{
    PageType = List;
    ApplicationArea = All;
    UsageCategory = Lists;
    SourceTable = Product;
    Caption = 'Products';
    CardPageId = "Product Card";
    Editable = false;

    layout
    {
        area(Content)
        {
            repeater(Products)
            {
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
                }
                field("Unit Price"; Rec."Unit Price")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the unit price of the product';
                }
                field("Quantity in Stock"; Rec."Quantity in Stock")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the quantity available in stock';
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
        }
    }

    actions
    {
        area(Processing)
        {
            action(NewProduct)
            {
                ApplicationArea = All;
                Caption = 'New';
                ToolTip = 'Create a new product';
                Image = New;
                Promoted = true;
                PromotedCategory = New;
                PromotedIsBig = true;

                trigger OnAction()
                var
                    Product: Record Product;
                begin
                    Product.Init();
                    Page.RunModal(Page::"Product Card", Product);
                end;
            }
        }
    }
}
