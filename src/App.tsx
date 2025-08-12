"use client";
import React, { useState } from "react";
import xss from "xss";
import "./App.css";

import { Accordion } from "react-bootstrap";

// Effect Declarations and Definitions

class Output {
  private contents: string = "";

  public write(w: string) {
    if (this.contents.length) {
      this.contents += `</br>`;
    }
    this.contents += xss(`${w}`);
  }

  public value(): string {
    return this.contents;
  }
}

const OutputEffect = "OutputEffect";

type EffectTypes = {
  "OutputEffect": Output;
};
type EffectLookupKey = keyof EffectTypes;
type EffectLookupResult<T extends EffectLookupKey> = EffectTypes[T];

const X = {
  OutputEffect: new Output(),
};

class Effect {
  public static lookup<E extends EffectLookupKey>(x: E): EffectLookupResult<E> {
    return X[x];
  }
}

class Bloom {
  public filter: number = 0;
  public newBits: Array<number>;

  public constructor(existing?: Bloom, newBits?: Array<number>) {
    if (existing?.filter) {
      this.filter = existing.filter;
    }
    this.newBits = new Array<number>();
    newBits?.forEach((v) => {
      this.add(v);
    });
  }

  private add(v: number) {
    this.newBits[v] = 1;
    this.filter |= 1 << v;
  }

  public has(v: Array<number>): boolean {
    const value = v.reduce((existing, next) => {
      return existing | (1 << next);
    }, 0);
    const output = Effect.lookup(OutputEffect);
    output.write(`Bloom filter being asked for v: ${v}`);
    output.write(`filter: ${this.filter}`);
    output.write(`result: ${this.filter & value}`);
    return (this.filter & value) == value;
  }
}

class CommandParserError {
  error: string;

  public constructor(msg: string) {
    this.error = msg;
  }

  public message(): string {
    return this.error;
  }
}

class Command<T> {
  public constructor() {
  }
  public execute(args: string, state: T) {
    throw "unimplemented";
  }
}

type CommandConstructor<T> = new (args: string) => T;
type CommandConstructorResult<C> = C extends CommandConstructor<infer U> ? U
  : never;

class TrackerCommandUsage extends Command<TrackerExecState> {
  public constructor() {
    super();
  }
  public execute(_args: string, _state: TrackerExecState) {
    const output = Effect.lookup(OutputEffect);
    output.write(`Usage:`);
    output.write(
      `log <package id>: Will log that <package id> is being sent by PrimAir Delivery.`,
    );
    output.write(
      `query <package id>: Will query whether <package id> is being sent by PrimAir Delivery.`,
    );
    output.write(`reset: Will reset Prim Air's package tracking system.`);
    output.write(`help: Will show this message.`);
  }
}

class TrackerCommandLog extends Command<TrackerExecState> {
  public constructor() {
    super();
  }

  public execute(args: string, state: TrackerExecState) {
    const output = Effect.lookup(OutputEffect);
    const parsed = Number.parseInt(args);
    if (Number.isNaN(parsed)) {
      output.write(`Could not parse the value being inserted: ${args}`);
      return;
    }
    const hasher = new SimpleHasher();
    const [calculatedNextValue, calculatedNextValue2] = hasher
      .calculate(parsed!);

    state.bloom = new Bloom(state.bloom!, [
      calculatedNextValue,
      calculatedNextValue2,
    ]);

    state.hashCalculations = [calculatedNextValue, calculatedNextValue2];
  }
}

class TrackerCommandQuery extends Command<TrackerExecState> {
  public constructor() {
    super();
  }
  public execute(args: string, state: TrackerExecState) {
    const output = Effect.lookup(OutputEffect);

    const hasher = new SimpleHasher();

    const parsed = Number.parseInt(args);
    if (Number.isNaN(parsed)) {
      output.write(`Could not parse the value being queried: ${args}`);
      return;
    }
    output.write(
      `Calculating the bits where ${parsed} would be in the filter ...`,
    );
    const [calculatedNextValue, calculatedNextValue2] = hasher
      .calculate(parsed);
    output.write(
      `${parsed} would be in the filter at bits ${calculatedNextValue} and ${calculatedNextValue2}.`,
    );
    if (state.bloom!.has([calculatedNextValue, calculatedNextValue2])) {
      output.write(`Package with ID ${parsed} _may_ be in the system.`);
    } else {
      output.write(
        `Package with ID ${parsed} is definitely not in the system.`,
      );
    }

    state.bloom = new Bloom(state.bloom);
  }
}

class TrackerExecState {
  public bloom: Bloom | undefined;
  public hashCalculations: [number, number] | undefined;
}

class CliParserParserSuccess<T> {
  public command: Command<T>;
  public args: string;

  public constructor(command: Command<T>, args: string) {
    this.command = command;
    this.args = args;
  }
}
class CliParser {
  parse(
    command: string,
  ): CliParserParserSuccess<TrackerExecState> | CommandParserError {
    const output = Effect.lookup(OutputEffect);
    output.write(`Attempting to parse command: ${command}`);
    const [base, params] = command.split(" ", 2);

    const parser: {
      [_: string]: CommandConstructorResult<
        CommandConstructor<typeof Command<TrackerExecState>>
      >;
    } = {
      "usage": TrackerCommandUsage,
      "log": TrackerCommandLog,
      "query": TrackerCommandQuery,
    };

    const commandGenerator = parser[base];
    if (commandGenerator !== undefined) {
      output.write(`Command parsing successful.`);
      return new CliParserParserSuccess(new commandGenerator(), params);
    }

    return new CommandParserError("Invalid command");
  }
}

interface Hasher {
  calculate(v: number): [number, number];
}

function tobits(v: number, space: number): Array<number> {
  const result: Array<number> = Array.from({ length: space }).map(() => 0);
  for (let i = 0; i < space; i++) {
    if (v % 2 == 1) {
      result[space - i - 1] = 1;
    }
    v = v >> 1;
  }
  return result;
}

class SimpleHasher implements Hasher {
  public calculate(v: number): [number, number] {
    const output = Effect.lookup(OutputEffect);
    output.write(`SimpleHasher: Calculating the two hash values for ${v}.`);
    output.write(
      `SimpleHasher: search value: ${tobits(v, 32)}`,
    );
    const orig = v;

    let evens = 0;
    let odds = 0;

    for (let ctr = 0; v != 0; ctr++) {
      const bit = v % 2;
      evens |= bit << ctr;
      v = v >> 2;
    }

    v = orig;
    v = v >> 1;
    for (let ctr = 0; v != 0; ctr++) {
      const bit = v % 2;
      odds |= bit << ctr;
      v = v >> 2;
    }

    output.write(
      `SimpleHasher: search odds: ${tobits(odds, 32)}`,
    );
    output.write(
      `SimpleHasher: search evens:  ${tobits(evens, 32)}`,
    );

    return [odds, evens];
  }
}

class VectorHasher implements Hasher {
  // deno-fmt-ignore
  private h1: Array<Array<number>> = [
  [ 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, ],
  [ 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, ],
  [ 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, ],
  [ 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, ],
  [ 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, ],
];
  // deno-fmt-ignore
  private h2: Array<Array<number>> = [
  [ 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, ],
  [ 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, ],
  [ 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, ],
  [ 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, ],
  [ 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, ],
];

  private frombits(v: Array<number>): number {
    return v.reduce((acc, current) => {
      return (acc << 1) | current;
    }, 0);
  }

  private tobits(v: number): Array<number> {
    const result: Array<number> = Array.from({ length: 64 }).map(() => 0);
    for (let i = 0; i < 64; i++) {
      if (v % 2 == 1) {
        result[64 - i - 1] = 1;
      }
      v = v >> 1;
    }
    return result;
  }

  private vecmul(row: Array<number>, col: Array<number>): number {
    let result = 0;
    for (let i = 0; i < row.length; i++) {
      result += row[i] * col[i];
    }

    return result % 2;
  }

  private matmul(h: Array<Array<number>>, k: Array<number>): number {
    const result: Array<number> = Array.from({ length: h.length }).map(() => 0);
    for (let i = 0; i < h.length; i++) {
      result[i] = this.vecmul(h[i], k);
    }
    console.log(`result: ${result}`);
    return this.frombits(result);
  }

  public calculate(v: number): [number, number] {
    console.log(`Next value? ${v}`);
    console.log(`Next value bits? ${this.tobits(v)}`);
    const nextValueBits = this.tobits(v);
    console.log(`Next value bits length? ${nextValueBits.length}`);

    const calculatedNextValue = this.matmul(this.h1, nextValueBits);
    const calculatedNextValue2 = this.matmul(this.h2, nextValueBits);

    return [calculatedNextValue, calculatedNextValue2];
  }
}

interface BloomFilterVisualizerProperties {
  value: number;
  filter_size: number;
  newadds: Array<number> | [];
}

interface BloomFilterBitProperties {
  new: boolean;
  on: boolean;
  index: number;
}

function App() {
  const [nextValue, setNextValue] = useState("");
  const [bloom, setBloom] = useState<Bloom>(new Bloom());
  const [terminaloutput, setTerminalOutput] = useState<string>("Welcome<br>Type usage for more information.");
  const [debug, setDebug] = useState<boolean>(true);

  const cliParser = new CliParser();

  function BloomFilterInfo(props: {}) {
    return (
      <div className="BloomFilterInfo">
        <div style={{display: "flex"}}>
          <div style={{ backgroundColor: "goldenrod", minWidth: "40px" }}>
            &nbsp;
          </div>
          <div style={{paddingLeft: "3px"}}>Bit in Bloom Filter Is On</div>
        </div>
        <div style={{display: "flex"}}>
          <div style={{ backgroundColor: "green", minWidth: "40px" }}>
            &nbsp;
          </div>
          <div style={{paddingLeft: "3px"}}>Bit in Bloom Filter Just Flipped</div>
        </div>
      </div>
    );
  }

  function BloomFilterBit(props: BloomFilterBitProperties) {
    return React.createElement("div", {
      key: `${props.index}`,
      className: "BloomFilterBitOuter",
    }, [
      React.createElement(
        "div",
        {
          className: props.new
            ? "BloomFilterBitHeaderNew"
            : "BloomFilterBitHeaderExisting",
        },
      ),

      <div className="BloomFilterBitHeader">
        {props.new ? props.index : props.index}
      </div>,

      React.createElement(
        "div",
        {
          className: "BloomFilterBitValue",
          style: { "backgroundColor": props.on ? "goldenrod" : "white" },
        },
        "",
      ),
    ]);
  }

  function BloomVisualizer(props: BloomFilterVisualizerProperties) {
    const component = Array.from({ length: props.filter_size }).map((
      _,
      k,
    ) => {
      const onoff = ((1 << k) & props.value) != 0;

      let newadd = false;
      if (props.newadds) {
        if (props.newadds[k]) {
          newadd = true;
        }
      }
      return <BloomFilterBit index={k} new={newadd} on={onoff} />;
    });
    return (
      <div className="BloomFilter">
        {component}
      </div>
    );
  }

  return (
    <>
      <div className="LogPackageTerminalOuter">
        <div className="LogPackageTerminalLogoLine">
          <div className="LogPackageTerminalLogo">
            PADC100
          </div>
        </div>
        <div className="LogPackageTerminalInner">
          <div
            className="LogPackageTerminalOutput"
            dangerouslySetInnerHTML={{ __html: terminaloutput }}
          >
          </div>
          <div className="LogPackageTerminalCli">
            <div className="LogPackagePrompt">
              &gt;
            </div>
            <div className="LogPackageInputHolder">
              <input
                className="LogPackageInput"
                type="text"
                autoFocus={true}
                onChange={(n) => {
                  setNextValue(n.target.value);
                }}
                onKeyUp={(e) => {
                  if (e.key !== "Enter") {
                    return;
                  }
                  // Now it's time for us to handle their command!
                  const output = Effect.lookup(OutputEffect);
                  const parseResults = cliParser.parse(nextValue);

                  let state = new TrackerExecState();
                  state.bloom = bloom;

                  if (parseResults instanceof CliParserParserSuccess) {
                    const [command, args] = [
                      parseResults.command,
                      parseResults.args,
                    ];
                    command.execute(args, state);
                    e.currentTarget.value = "";
                  } else if (parseResults instanceof CommandParserError) {
                    output.write(
                      `There was an error parsing the command: ${parseResults.message()}`,
                    );
                  } else {
                    output.write(
                      "There was an error parsing the command: unknown.\n",
                    );
                  }

                  setTerminalOutput(output.value());
                  setBloom(state.bloom);
                  e.preventDefault();
                }}
              />
            </div>
          </div>
        </div>
        <div
          className="BloomFilterWrapper"
          style={{ display: debug ? "flex" : "none" }}
        >
          <Accordion defaultActiveKey={["0"]} alwaysOpen>
            <Accordion.Item eventKey="0">
              <Accordion.Header>Bloom Filter Status</Accordion.Header>
              <Accordion.Body>
                <BloomVisualizer
                  filter_size={32}
                  value={bloom.filter}
                  newadds={bloom.newBits}
                />
                <BloomFilterInfo />
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>
      </div>
    </>
  );
}

export default App;
