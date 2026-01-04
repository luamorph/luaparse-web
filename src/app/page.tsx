"use client"
import { useState, useEffect } from "react"

const DEFAULT_CODE = `
local function greet(name: string): string
    return \`Hello, {name}!\`
end

local message = greet("World")
print(message)`

type LuaVersion = "luau" | "5.1" | "5.2" | "5.3"

export default function LuauASTParser() {
  const [input, setInput] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState("")
  const [version, setVersion] = useState<LuaVersion>("luau")
  const [parseFunction, setParseFunction] = useState<((code: string, ver: string) => string) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadWasm = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const wasmModule = await import('./wasm/luau_ast_parse.js')
        
        await wasmModule.default()
        
        const parser = (code: string, ver: string): string => {
          try {
            return wasmModule.parse(code, ver)
          } catch (err) {
            return `Parse Error: ${err instanceof Error ? err.message : String(err)}`
          }
        }
        
        setParseFunction(() => parser)
        setIsLoading(false)
      } catch (err) {
        console.error("Failed to load WASM module:", err)
        setError(`Failed to load parser: ${err instanceof Error ? err.message : String(err)}`)
        setIsLoading(false)
      }
    }
    
    loadWasm()
  }, [])

  // Parse input whenever it changes
  useEffect(() => {
    if (parseFunction && input) {
      try {
        const result = parseFunction(input, version)
        setOutput(result)
      } catch (err) {
        setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }, [input, version, parseFunction])

  const lineCount = input.split("\n").length
  const charCount = input.length

  return (
    <div className="min-h-screen bg-[#111014] flex flex-col font-mono">
      {/* Header */}
      <header className="text-center py-12 px-4 border-b border-[#df5050]/20">
        <h1 className="text-4xl font-bold text-[#df5050] mb-3 tracking-tight">
          Lua AST Parser
        </h1>
        <p className="text-white/70 text-sm">
          Enter Lua code on the left to see the parsed AST on the right
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {(["luau", "5.1", "5.2", "5.3"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                version === v
                  ? "bg-[#df5050] text-white"
                  : "bg-[#1d1b22] text-white/60 hover:text-white border border-[#df5050]/20"
              }`}
            >
              {v === "luau" ? "Luau" : `Lua ${v}`}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content - Two Panel Layout */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full border border-[#df5050]/20">
            {/* Left Panel - Input */}
            <div className="flex flex-col bg-[#1d1b22] overflow-hidden min-h-[600px] lg:min-h-0 border-r border-[#df5050]/20">
              <div className="bg-[#111014] px-6 py-3 border-b border-[#df5050]/20">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Input
                </h2>
              </div>
              
              {/* Textarea */}
              <div className="flex-1 p-0">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault()
                      const start = e.currentTarget.selectionStart
                      const end = e.currentTarget.selectionEnd
                      const newValue = input.substring(0, start) + "\t" + input.substring(end)
                      setInput(newValue)
                      setTimeout(() => {
                        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1
                      }, 0)
                    }
                  }}
                  placeholder="Enter Lua code here..."
                  spellCheck={false}
                  className="w-full h-full bg-[#1d1b22] text-white font-mono text-sm resize-none outline-none p-6 leading-relaxed placeholder:text-white/30"
                />
              </div>
              
              <div className="bg-[#111014] px-6 py-3 border-t border-[#df5050]/20 flex justify-between text-xs text-white/60 font-bold">
                <span>{lineCount} LINES</span>
                <span>{charCount} CHARACTERS</span>
              </div>
            </div>

            {/* Right Panel - AST Output */}
            <div className="flex flex-col bg-[#1d1b22] overflow-hidden min-h-[600px] lg:min-h-0">
              {/* Panel Header */}
              <div className="bg-[#111014] px-6 py-3 border-b border-[#df5050]/20">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  AST Output
                </h2>
              </div>
              
              {/* Output Display */}
              <div className="flex-1 p-6 overflow-auto">
                {isLoading ? (
                  <div className="text-white/50 text-sm">Loading WASM parser...</div>
                ) : error ? (
                  <div className="text-[#df5050] text-sm">{error}</div>
                ) : (
                  <pre className="text-[#1bbb36] font-mono text-sm whitespace-pre leading-relaxed">
                    {output || "Waiting for input..."}
                  </pre>
                )}
              </div>
              
              <div className="bg-[#111014] px-6 py-3 border-t border-[#df5050]/20 flex justify-between text-xs text-white/60 font-bold">
                <span>{isLoading ? "INITIALIZING..." : error ? "ERROR" : "READY"}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 px-4 border-t border-[#df5050]/20">
        <p className="text-white/50 text-xs">
          Built with Rust + WASM · Find edge cases and report them!
        </p>
      </footer>
    </div>
  )
}