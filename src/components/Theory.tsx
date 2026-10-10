import type { TheoryBlock } from '../types';

// Theory texts come from our own JSON files and may contain simple <b>/<br> markup.
const html = (text: string) => ({ __html: text });

export default function Theory({ blocks }: { blocks: TheoryBlock[] }) {
  return (
    <div className="theory">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h':
            return <h3 key={i} dangerouslySetInnerHTML={html(block.text)} />;
          case 'p':
            return <p key={i} dangerouslySetInnerHTML={html(block.text)} />;
          case 'tip':
            return <div key={i} className="tip" dangerouslySetInnerHTML={html(block.text)} />;
          case 'list':
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={html(item)} />
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={i} className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {block.head.map((h, j) => (
                        <th key={j} dangerouslySetInnerHTML={html(h)} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c} dangerouslySetInnerHTML={html(cell)} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
