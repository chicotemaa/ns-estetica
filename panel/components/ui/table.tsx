"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const MobileTableLabels = React.createContext<string[] | undefined>(undefined);

function Table({
  className,
  mobileLabels,
  ...props
}: React.ComponentProps<"table"> & { mobileLabels?: string[] }) {
  return (
    <MobileTableLabels.Provider value={mobileLabels}>
      <div
        data-slot="table-container"
        className="responsive-table-container relative min-w-0 w-full overflow-x-auto"
      >
        <table
          role="table"
          data-slot="table"
          className={cn(
            "w-full caption-bottom text-sm",
            mobileLabels && "responsive-table",
            className,
          )}
          {...props}
        />
      </div>
    </MobileTableLabels.Provider>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({
  className,
  children,
  ...props
}: React.ComponentProps<"tr">) {
  const labels = React.useContext(MobileTableLabels);
  return (
    <tr
      role="row"
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    >
      {labels
        ? React.Children.map(children, (child, index) => {
            if (
              !React.isValidElement<
                React.ComponentProps<"td"> & { "data-label"?: string }
              >(child) ||
              child.type !== TableCell ||
              child.props.colSpan
            )
              return child;
            return React.cloneElement(child, { "data-label": labels[index] });
          })
        : children}
    </tr>
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      role="columnheader"
      scope="col"
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      role="cell"
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
