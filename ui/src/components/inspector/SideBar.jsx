import React, { useRef, useState } from "react";
import { useHotkeys } from 'react-hotkeys-hook';
import { useParams } from "react-router-dom";
import _ from "lodash";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";
import { apply, tw } from "twind";
import { css } from "twind/css";
import {
  getBestSolution,
  getSolution,
  getSolutions
} from "../../api";
import { useAppState } from "../../app-state";
import Spacer from "../common/Spacer";
import Button from "../common/Button";
import { Col, Row } from "../common/Flex";
import { useRaf, parseBlockIdsFromCommand } from "../../utils/utils";
import { Select, TextArea } from "../common/Inputs";
import { forwardRef } from "react";
import {
  solutionResult,
  previewLOC,
  previewBlockIds
} from "../Inspector.stores";



const InstructionLog = forwardRef(({ code, className }, ref) => {
  const [selectedLOC, setSelectedLOC] = useState();
  if (!code)
    return <div>Nothing to display</div>;
  const instructions = code.split('\n');
  const unpreviewLOC = () => {
    previewLOC.set(selectedLOC || null);
  };
  return (
    <Col ref={ref} onMouseLeave={unpreviewLOC} className={tw(`flex-1 font-mono items-start overflow-auto whitespace-nowrap`, css({ flexBasis: 0 }), className)}>
      {instructions.map((line, idx) => {
        const selected = selectedLOC == idx;
        const cls = tw(apply`min-w-full min-h-[1.25rem] h-[1.25rem] px-1 -mx-1 cursor-pointer rounded`, selected ? `bg-[rgba(255,120,120,0.75)]` : `hover:bg-[rgba(255,255,255,0.75)]`);
        const hoverLOC = () => {
          previewLOC.set(idx);
          let blockIds = parseBlockIdsFromCommand(line);
          previewBlockIds.set(blockIds);
        };
        const onClick = () => {
          if (selected) {
            setSelectedLOC(null);
            previewBlockIds.set([]);
          } else {
            setSelectedLOC(idx);
            let blockIds = parseBlockIdsFromCommand(line);
            previewBlockIds.set(blockIds);
          }
        };
        return <div key={idx} onClick={onClick} onMouseEnter={hoverLOC} className={cls}>{line}</div>;
      })}
    </Col>
  );
});



function FlameGraph({ className, items, maxSize }) {
  const labelsCls = tw(apply`block whitespace-pre-wrap leading-tight`, className);
  const labelCls = tw(apply`h-[1.25rem]`);
  let cumulative = []
  items.forEach((v, idx) => { cumulative[idx] = v + (cumulative[idx-1]||0) });
  const maxItems = maxSize ? Math.max(maxSize, items.length) : items.length;
  const labels = _.times(maxItems, idx => {
    const lineLabel = `${idx + 1}:`.padEnd(3);
    const actionCostLabel = items[idx] && ('+' + items[idx]).padEnd(4);
    const sumLabel = cumulative[idx] && '= ' + cumulative[idx];
    const str = _.filter([lineLabel, actionCostLabel, sumLabel], v => v).join(' ');
    return str;
  });

  return (
    <pre className={labelsCls}>
      {labels.map((label, idx) => (
        <div key={idx} className={labelCls}>{label}</div>
      ))}
    </pre>
  );
}





export function SideBar({ className }) {
  const textAreaRef = useRef();
  const { data } = useQuery(["solutions"], getSolutions);
  const [viewMode] = useAppState("viewMode");
  const { problemId } = useParams();
  const [solutionId, setSolutionId] = useAppState("currentSolutionId");
  const [code, setCode] = useAppState("currentCode");
  const _solutionResult = useStore(solutionResult);
  const error = _solutionResult?.error;
  const errorLine = _solutionResult?.errorLine;
  const actionsCost = _solutionResult?.actionsCost;
  const [editMode, setEditMode] = useAppState("codeEditMode") || false;
  const removeLastLine = () => {
    if (!code || editMode) {
      return;
    }
    const newCode = code.split('\n').slice(0, -1).join('\n');
    setCode(newCode);
  };
  useHotkeys('Shift+D', removeLastLine, [code]);
  const onToggleEditMode = () => setEditMode(!editMode);
  const onSelectSolution = async (_solutionId) => {
    setSolutionId(_solutionId);
    if (_solutionId == "__best") {
      const code = await getBestSolution(problemId);
      setCode(code);
    } else if (_solutionId == "__new") {
      setCode("# Let's go!!!\n");
    } else {
      const code = await getSolution(_solutionId);
      setCode(code);
    }
  };
  const reloadSolution = async () => await onSelectSolution(solutionId);
  const onChangeCode = async (code) => {
    setCode(code);
  };
  const [scroll, setScroll] = useState(0);
  useRaf(() => {
    if (!textAreaRef.current)
      return;
    setScroll(textAreaRef.current.scrollTop);
  }, [textAreaRef.current]);
  return (
    <Col
      className={tw(
        `relative w-[30rem] bg-gray-100 p-2 items-stretch transition-all`,
        css({ flexBasis: viewMode == 'wide' ? '48rem' : '30rem' }),
        className
      )}
    >
      <Row gutter={1}>
        <h2 className={tw`text-2xl font-bold`}>Solution</h2>
        <Select
          value={solutionId || "__none"}
          onChangeValue={onSelectSolution}
          className={tw`flex-1`}
        >
          {!solutionId && <option value="__none">&lt;Pick one&gt;</option>}
          {data?.solutions
            ?.filter((s) => (problemId ? s.includes(`/${problemId}.txt`) : s))
            .map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          {problemId && <option value="__new">Manual</option>}
          {problemId && <option value="__best">BEST</option>}
        </Select>
        <Button color='transparent' className={tw`w-10 h-10 text-3xl p-0 hover:bg-gray-300 active:bg-gray-400`} onClick={reloadSolution}>♻️</Button>
        <Button color={editMode ? 'red' : 'blue'} className={tw`w-24`} onClick={onToggleEditMode}>{editMode ? 'Done' : 'Edit'}</Button>
      </Row>
      <Spacer size={1} />
      <Col className={tw`flex-1`}>
        <Col className={tw`relative flex-1 w-full items-stretch`}>
          {actionsCost && (
            <FlameGraph
              className={tw(
                apply`absolute top-0 pointer-events-none left-[calc(100%-2rem)] w-[16rem] py-3 px-4 text-red-700`,
                `translate-y-[-${scroll}px]`
              )}
              items={actionsCost}
              maxSize={code.split('\n').length} />
          )}
          {editMode
            ? <TextArea
              ref={textAreaRef}
              value={code}
              onChangeValue={onChangeCode}
              className={tw(
                apply`flex-1 bg-white font-mono whitespace-pre border-0 resize-none py-3 px-4 pr-8`,
                error && "bg-red-300 focus:bg-red-200 active:bg-red-200"
              )} />
            : <InstructionLog
              ref={textAreaRef}
              className={tw(`bg-gray-200 py-3 px-4 leading-tight`, css({ flexBasis: 0 }))}
              code={code} />}
        </Col>
      </Col>
      {error && (
        <pre
          className={tw`absolute top-[calc(100%+.5rem)] l-1 w-[70rem] left-2 text-red-700 whitespace-pre-wrap`}
        >
          Error on line {errorLine + 1}
          {"\n"}
          {error.toString()}
        </pre>
      )}
    </Col>
  );
}
