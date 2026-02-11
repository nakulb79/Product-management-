table 50100 "Product"
{
    DataClassification = CustomerContent;
    Caption = 'Product';

    fields
    {
        field(1; "No."; Code[20])
        {
            DataClassification = CustomerContent;
            Caption = 'No.';
        }
        field(2; Name; Text[100])
        {
            DataClassification = CustomerContent;
            Caption = 'Name';
        }
        field(3; Description; Text[250])
        {
            DataClassification = CustomerContent;
            Caption = 'Description';
        }
        field(4; "Unit Price"; Decimal)
        {
            DataClassification = CustomerContent;
            Caption = 'Unit Price';
            DecimalPlaces = 2 : 2;
            MinValue = 0;
        }
        field(5; "Quantity in Stock"; Decimal)
        {
            DataClassification = CustomerContent;
            Caption = 'Quantity in Stock';
            DecimalPlaces = 0 : 2;
            MinValue = 0;
        }
        field(6; Category; Text[50])
        {
            DataClassification = CustomerContent;
            Caption = 'Category';
        }
        field(7; "Reorder Point"; Decimal)
        {
            DataClassification = CustomerContent;
            Caption = 'Reorder Point';
            DecimalPlaces = 0 : 2;
            MinValue = 0;
        }
        field(8; Blocked; Boolean)
        {
            DataClassification = CustomerContent;
            Caption = 'Blocked';
        }
        field(9; "Last Date Modified"; Date)
        {
            DataClassification = CustomerContent;
            Caption = 'Last Date Modified';
            Editable = false;
        }
    }

    keys
    {
        key(PK; "No.")
        {
            Clustered = true;
        }
        key(Name; Name)
        {
        }
    }

    trigger OnInsert()
    begin
        "Last Date Modified" := Today;
    end;

    trigger OnModify()
    begin
        "Last Date Modified" := Today;
    end;

    trigger OnRename()
    begin
        "Last Date Modified" := Today;
    end;
}
