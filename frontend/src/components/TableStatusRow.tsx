import { CSSProperties } from 'react';

type TableStatusRowProps = {
  colSpan: number;
  text: string;
  style?: CSSProperties;
};

function TableStatusRow({ colSpan, text, style }: TableStatusRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="muted" style={{ textAlign: 'center', padding: '3rem', ...style }}>
        {text}
      </td>
    </tr>
  );
}

export default TableStatusRow;
